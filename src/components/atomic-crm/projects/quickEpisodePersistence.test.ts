import { describe, expect, it, vi } from "vitest";

import {
  buildQuickEpisodeDuplicateConfirmMessage,
  buildQuickEpisodeExpenseCreateData,
  buildQuickEpisodeServiceCreateData,
  findExistingQuickEpisodeServices,
} from "./quickEpisodePersistence";

describe("quickEpisodePersistence", () => {
  const record = {
    id: "project-tv-1",
    client_id: "client-1",
  };

  const data = {
    service_date: "2026-02-22",
    service_type: "riprese_montaggio" as const,
    fee_shooting: 233,
    fee_editing: 156,
    fee_other: 0,
    km_distance: 144.24,
    km_rate: 0.19,
    location: "Acireale",
    notes: "Intervista a Roberto Lipari",
    extra_expenses: [
      {
        expense_type: "altro" as const,
        amount: 12.5,
        markup_percent: 0,
        description: "Casello autostradale",
      },
      {
        expense_type: "altro" as const,
        amount: 18,
        markup_percent: 10,
        description: "Pranzo troupe",
      },
      {
        expense_type: "noleggio" as const,
        amount: 0,
        markup_percent: 0,
        description: "",
      },
    ],
  };

  it("builds the service payload for the quick-episode save, inheriting client_id from the project", () => {
    expect(
      buildQuickEpisodeServiceCreateData({
        record,
        data,
      }),
    ).toEqual({
      project_id: "project-tv-1",
      client_id: "client-1",
      service_date: "2026-02-22",
      all_day: true,
      is_taxable: true,
      service_type: "riprese_montaggio",
      fee_shooting: 233,
      fee_editing: 156,
      fee_other: 0,
      discount: 0,
      km_distance: 144.24,
      km_rate: 0.19,
      location: "Acireale",
      notes: "Intervista a Roberto Lipari",
    });
  });

  it("builds only extra (non-km) expense payloads — km expenses are auto-created by DB trigger", () => {
    expect(
      buildQuickEpisodeExpenseCreateData({
        record,
        data,
      }),
    ).toEqual([
      {
        project_id: "project-tv-1",
        client_id: "client-1",
        expense_date: "2026-02-22",
        expense_type: "altro",
        amount: 12.5,
        markup_percent: 0,
        description: "Casello autostradale",
      },
      {
        project_id: "project-tv-1",
        client_id: "client-1",
        expense_date: "2026-02-22",
        expense_type: "altro",
        amount: 18,
        markup_percent: 10,
        description: "Pranzo troupe",
      },
    ]);
  });

  describe("findExistingQuickEpisodeServices", () => {
    const makeDataProvider = (
      returnedServices: Array<Record<string, unknown>>,
    ) => ({
      getList: vi.fn().mockResolvedValue({
        data: returnedServices,
        total: returnedServices.length,
      }),
    });

    it("queries services scoped to the project + business day and returns matches", async () => {
      const dataProvider = makeDataProvider([
        {
          id: "svc-existing",
          project_id: "project-tv-1",
          description: "Prima ripresa",
        },
      ]);

      const result = await findExistingQuickEpisodeServices({
        dataProvider: dataProvider as unknown as Parameters<
          typeof findExistingQuickEpisodeServices
        >[0]["dataProvider"],
        projectId: "project-tv-1",
        serviceDate: "2026-04-11",
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("svc-existing");

      expect(dataProvider.getList).toHaveBeenCalledTimes(1);
      const [resource, params] = dataProvider.getList.mock.calls[0];
      expect(resource).toBe("services");
      expect(params.filter.project_id).toBe("project-tv-1");

      // Business-day window in Europe/Rome is bounded by @gte / @lte on service_date.
      const gte = params.filter["service_date@gte"] as string;
      const lte = params.filter["service_date@lte"] as string;
      expect(gte).toMatch(/^2026-04-(10|11)T/);
      expect(lte).toMatch(/^2026-04-(11|12)T/);
      expect(new Date(gte).getTime()).toBeLessThan(new Date(lte).getTime());
    });

    it("returns an empty array when no services exist on the same day", async () => {
      const dataProvider = makeDataProvider([]);

      const result = await findExistingQuickEpisodeServices({
        dataProvider: dataProvider as unknown as Parameters<
          typeof findExistingQuickEpisodeServices
        >[0]["dataProvider"],
        projectId: "project-tv-1",
        serviceDate: "2026-04-11",
      });

      expect(result).toEqual([]);
    });

    it("returns an empty array when projectId or serviceDate is missing", async () => {
      const dataProvider = makeDataProvider([{ id: "svc-1" }]);

      const missingProject = await findExistingQuickEpisodeServices({
        dataProvider: dataProvider as unknown as Parameters<
          typeof findExistingQuickEpisodeServices
        >[0]["dataProvider"],
        projectId: "",
        serviceDate: "2026-04-11",
      });
      const missingDate = await findExistingQuickEpisodeServices({
        dataProvider: dataProvider as unknown as Parameters<
          typeof findExistingQuickEpisodeServices
        >[0]["dataProvider"],
        projectId: "project-tv-1",
        serviceDate: "",
      });

      expect(missingProject).toEqual([]);
      expect(missingDate).toEqual([]);
      expect(dataProvider.getList).not.toHaveBeenCalled();
    });
  });

  describe("buildQuickEpisodeDuplicateConfirmMessage", () => {
    it("returns null when there are no existing services", () => {
      expect(
        buildQuickEpisodeDuplicateConfirmMessage([], "2026-04-11"),
      ).toBeNull();
    });

    it("formats a singular message when exactly one duplicate exists", () => {
      const message = buildQuickEpisodeDuplicateConfirmMessage(
        [{ description: "Savoca - Bar Vitelli" }],
        "2026-04-11",
      );

      expect(message).not.toBeNull();
      expect(message).toContain("un servizio");
      expect(message).toContain("11/04/2026");
      expect(message).toContain("«Savoca - Bar Vitelli»");
      expect(message).toContain("Vuoi comunque registrare un'altra puntata?");
    });

    it("formats a plural message when multiple duplicates exist", () => {
      const message = buildQuickEpisodeDuplicateConfirmMessage(
        [{ description: "Spot A" }, { description: "Spot B" }],
        "2026-04-11",
      );

      expect(message).toContain("2 servizi");
      expect(message).toContain("«Spot A»");
    });

    it("omits the sample description when it is missing or blank", () => {
      const message = buildQuickEpisodeDuplicateConfirmMessage(
        [{ description: "   " }],
        "2026-04-11",
      );

      expect(message).not.toContain("«");
      expect(message).toContain("un servizio");
    });
  });
});
