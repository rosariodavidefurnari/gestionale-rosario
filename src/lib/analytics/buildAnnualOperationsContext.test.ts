import { afterEach, describe, expect, it, vi } from "vitest";

import { buildDashboardModel } from "@/components/atomic-crm/dashboard/dashboardModel";
import type { Client, Project, Service } from "@/components/atomic-crm/types";

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
});
