import { afterEach, describe, expect, it, vi } from "vitest";

import { buildDashboardModel } from "@/components/atomic-crm/dashboard/dashboardModel";
import type {
  Client,
  Payment,
  Project,
  Quote,
  Service,
} from "@/components/atomic-crm/types";

import { buildAnnualOperationsContext } from "./buildAnnualOperationsContext";

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
  service_date: "2026-01-10T10:00:00.000Z",
  all_day: false,
  service_type: "riprese",
  fee_shooting: 0,
  fee_editing: 0,
  fee_other: 0,
  discount: 0,
  km_distance: 0,
  km_rate: 0,
  created_at: "2026-01-01T00:00:00.000Z",
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
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const basePayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 1,
  client_id: 1,
  amount: 0,
  payment_type: "saldo",
  status: "ricevuto",
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildAnnualOperationsContext", () => {
  it("serializes a yearly operational context with clear caveats", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-28T09:00:00.000Z"));

    const model = buildDashboardModel({
      payments: [],
      quotes: [],
      services: [
        baseService({ fee_shooting: 1000, discount: 100 }),
        baseService({
          id: 2,
          service_date: "2026-03-20T10:00:00.000Z",
          fee_shooting: 200,
        }),
      ],
      projects: [baseProject()],
      clients: [baseClient()],
      expenses: [],
      year: 2026,
    });

    const context = buildAnnualOperationsContext(model);

    expect(context.meta.selectedYear).toBe(2026);
    expect(context.qualityFlags).toContain("partial_current_year");
    expect(context.qualityFlags).toContain("future_services_excluded");
    expect(context.metrics.find((item) => item.id === "annual_work_value"))
      .toMatchObject({
        value: 900,
        basis: "work_value",
      });
    expect(context.caveats).toContain(
      "Questo contesto AI riguarda solo la parte operativa dell'anno: alert del giorno e simulazione fiscale restano fuori.",
    );
  });

  it("includes drilldowns for pending payments and open quotes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-28T09:00:00.000Z"));

    const model = buildDashboardModel({
      payments: [
        basePayment({
          id: 1,
          amount: 500,
          status: "in_attesa",
          quote_id: 1,
          payment_date: "2026-02-15T00:00:00.000Z",
        }),
      ],
      quotes: [
        baseQuote({
          id: 1,
          description: "Wedding completo",
          amount: 1200,
          status: "preventivo_inviato",
          sent_date: "2026-02-01T00:00:00.000Z",
          quote_items: [
            {
              description: "Riprese",
              quantity: 1,
              unit_price: 800,
            },
            {
              description: "Montaggio",
              quantity: 1,
              unit_price: 400,
            },
          ],
        }),
      ],
      services: [baseService({ fee_shooting: 600 })],
      projects: [baseProject()],
      clients: [baseClient({ name: "Cliente Wedding" })],
      expenses: [],
      year: 2026,
    });

    const context = buildAnnualOperationsContext(model);

    expect(context.drilldowns.pendingPayments).toEqual([
      {
        paymentId: "1",
        clientId: "1",
        clientName: "Cliente Wedding",
        projectId: undefined,
        projectName: undefined,
        quoteId: "1",
        amount: 500,
        status: "in_attesa",
        paymentDate: "2026-02-15T00:00:00.000Z",
      },
    ]);
    expect(context.drilldowns.openQuotes).toEqual([
      {
        quoteId: "1",
        clientId: "1",
        clientName: "Cliente Wedding",
        projectId: undefined,
        projectName: undefined,
        description: "Wedding completo",
        amount: 1200,
        status: "preventivo_inviato",
        statusLabel: "Preventivo inviato",
        sentDate: "2026-02-01T00:00:00.000Z",
        hasProject: false,
        hasItemizedLines: true,
        quoteItemsCount: 2,
      },
    ]);
  });
});
