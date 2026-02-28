import { afterEach, describe, expect, it, vi } from "vitest";

import { buildDashboardModel } from "./dashboardModel";
import type {
  Client,
  Expense,
  FiscalConfig,
  Payment,
  Project,
  Quote,
  Service,
} from "../types";

const baseClient = (overrides: Partial<Client> = {}): Client => ({
  id: 1,
  name: "Cliente Test",
  client_type: "azienda_locale",
  tags: [],
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

const baseProject = (overrides: Partial<Project> = {}): Project => ({
  id: 1,
  client_id: 1,
  name: "Progetto Test",
  category: "produzione_tv",
  status: "in_corso",
  all_day: false,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

const baseService = (overrides: Partial<Service> = {}): Service => ({
  id: 1,
  project_id: 1,
  service_date: "2025-01-10T10:00:00.000Z",
  all_day: false,
  service_type: "riprese",
  fee_shooting: 0,
  fee_editing: 0,
  fee_other: 0,
  discount: 0,
  km_distance: 0,
  km_rate: 0,
  created_at: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

const baseQuote = (overrides: Partial<Quote> = {}): Quote => ({
  id: 1,
  client_id: 1,
  service_type: "riprese",
  all_day: false,
  amount: 0,
  status: "preventivo_inviato",
  index: 0,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

const basePayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 1,
  client_id: 1,
  amount: 0,
  payment_type: "saldo",
  status: "ricevuto",
  created_at: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

const fiscalConfig: FiscalConfig = {
  taxProfiles: [
    {
      atecoCode: "59.11.00",
      description: "Produzione video",
      coefficienteReddititivita: 78,
      linkedCategories: ["produzione_tv", "spot"],
    },
  ],
  aliquotaINPS: 26,
  tettoFatturato: 85000,
  annoInizioAttivita: 2023,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("buildDashboardModel annual semantics", () => {
  it("reads the current year as year-to-date and excludes future services with the same net basis everywhere", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-28T09:00:00.000Z"));

    const clients: Client[] = [
      baseClient({ id: 1, name: "Cliente A" }),
      baseClient({ id: 2, name: "Cliente B" }),
    ];
    const projects: Project[] = [
      baseProject({ id: 1, client_id: 1, category: "produzione_tv" }),
      baseProject({ id: 2, client_id: 2, category: "spot" }),
    ];
    const services: Service[] = [
      baseService({
        id: 1,
        project_id: 1,
        service_date: "2026-01-10T10:00:00.000Z",
        fee_shooting: 1000,
        discount: 100,
        km_distance: 10,
        km_rate: 0.5,
      }),
      baseService({
        id: 2,
        project_id: 2,
        service_date: "2026-02-12T10:00:00.000Z",
        fee_shooting: 500,
      }),
      baseService({
        id: 3,
        project_id: 1,
        service_date: "2026-03-10T10:00:00.000Z",
        fee_shooting: 700,
        discount: 50,
      }),
    ];

    const model = buildDashboardModel({
      payments: [],
      quotes: [],
      services,
      projects,
      clients,
      expenses: [],
      year: 2026,
    });

    expect(model.isCurrentYear).toBe(true);
    expect(model.kpis.annualRevenue).toBe(1400);
    expect(model.kpis.monthlyRevenue).toBe(500);
    expect(model.revenueTrend).toHaveLength(2);
    expect(model.qualityFlags).toContain("partial_current_year");
    expect(model.qualityFlags).toContain("future_services_excluded");
    expect(model.meta.asOfDate).toBe("2026-02-28");
    expect(model.meta.operationsPeriodLabel).toBe("gen-feb 2026");
    expect(
      model.topClients.map((item) => [item.clientName, item.revenue]),
    ).toEqual([
      ["Cliente A", 900],
      ["Cliente B", 500],
    ]);
    expect(
      model.categoryBreakdown.map((item) => [item.category, item.revenue]),
    ).toEqual([
      ["produzione_tv", 900],
      ["spot", 500],
    ]);
  });

  it("filters fiscal conversion, weighted pipeline, and DSO on the selected year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T09:00:00.000Z"));

    const clients: Client[] = [baseClient({ id: 1, name: "Cliente A" })];
    const projects: Project[] = [baseProject({ id: 1, client_id: 1 })];
    const services: Service[] = [
      baseService({
        id: 1,
        service_date: "2025-01-10T10:00:00.000Z",
        fee_shooting: 1000,
      }),
      baseService({
        id: 2,
        service_date: "2026-01-10T10:00:00.000Z",
        fee_shooting: 5000,
      }),
    ];
    const quotes: Quote[] = [
      baseQuote({
        id: 1,
        status: "accettato",
        amount: 1000,
        created_at: "2025-01-05T00:00:00.000Z",
      }),
      baseQuote({
        id: 2,
        status: "preventivo_inviato",
        amount: 2000,
        created_at: "2025-02-10T00:00:00.000Z",
      }),
      baseQuote({
        id: 3,
        status: "preventivo_inviato",
        amount: 9999,
        created_at: "2026-02-10T00:00:00.000Z",
      }),
    ];
    const payments: Payment[] = [
      basePayment({
        id: 1,
        project_id: 1,
        amount: 1000,
        payment_date: "2025-03-01T00:00:00.000Z",
      }),
      basePayment({
        id: 2,
        project_id: 1,
        amount: 1000,
        payment_date: "2026-03-01T00:00:00.000Z",
      }),
    ];

    const model = buildDashboardModel({
      payments,
      quotes,
      services,
      projects,
      clients,
      expenses: [] satisfies Expense[],
      fiscalConfig,
      year: 2025,
    });

    expect(model.isCurrentYear).toBe(false);
    expect(model.meta.monthlyReferenceLabel).toBe("dic 25");
    expect(model.revenueTrend).toHaveLength(12);
    expect(model.fiscal?.businessHealth.quoteConversionRate).toBe(50);
    expect(model.fiscal?.businessHealth.weightedPipelineValue).toBe(1000);
    expect(model.fiscal?.businessHealth.dso).toBe(50);
  });
});
