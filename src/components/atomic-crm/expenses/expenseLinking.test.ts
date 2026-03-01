import { describe, expect, it } from "vitest";

import {
  buildExpenseCreatePathFromTravel,
  getExpenseCreateDefaultsFromSearch,
  getUnifiedAiExpenseBannerCopy,
  getUnifiedAiExpenseHandoffContextFromSearch,
} from "./expenseLinking";

describe("expenseLinking", () => {
  it("reads km travel prefills from the launcher search params", () => {
    const defaults = getExpenseCreateDefaultsFromSearch(
      "?expense_type=spostamento_km&expense_date=2026-03-01&km_distance=160.98&km_rate=0.19&description=Trasferta%20Valguarnera%20-%20Catania%20A%2FR&launcher_source=unified_ai_launcher&launcher_action=expense_create_km",
    );

    expect(defaults).toEqual(
      expect.objectContaining({
        expense_type: "spostamento_km",
        expense_date: "2026-03-01",
        km_distance: 160.98,
        km_rate: 0.19,
        description: "Trasferta Valguarnera - Catania A/R",
      }),
    );
  });

  it("extracts launcher handoff context for km expense creation", () => {
    expect(
      getUnifiedAiExpenseHandoffContextFromSearch(
        "?launcher_source=unified_ai_launcher&launcher_action=expense_create_km",
      ),
    ).toEqual({
      source: "unified_ai_launcher",
      action: "expense_create_km",
    });
  });

  it("builds a launcher banner for km expense handoff", () => {
    expect(
      getUnifiedAiExpenseBannerCopy(
        "?launcher_source=unified_ai_launcher&launcher_action=expense_create_km",
      ),
    ).toContain("trasferta km gia calcolata");
  });

  it("builds a launcher banner for generic expense handoff", () => {
    expect(
      getUnifiedAiExpenseBannerCopy(
        "?launcher_source=unified_ai_launcher&launcher_action=expense_create",
      ),
    ).toContain("spesa gia collegata");
  });

  it("builds a create path for km travel expenses", () => {
    expect(
      buildExpenseCreatePathFromTravel({
        expense_date: "2026-03-01",
        km_distance: 160.98,
        km_rate: 0.19,
        description: "Trasferta Valguarnera - Catania A/R",
      }),
    ).toBe(
      "/expenses/create?expense_type=spostamento_km&km_distance=160.98&launcher_source=unified_ai_launcher&launcher_action=expense_create_km&expense_date=2026-03-01&km_rate=0.19&description=Trasferta+Valguarnera+-+Catania+A%2FR",
    );
  });
});
