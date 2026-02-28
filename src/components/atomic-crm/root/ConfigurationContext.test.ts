import { describe, expect, it } from "vitest";

import { mergeConfigurationWithDefaults } from "./ConfigurationContext";

describe("mergeConfigurationWithDefaults", () => {
  it("keeps new nested AI defaults when persisted config is older", () => {
    const merged = mergeConfigurationWithDefaults({
      aiConfig: {
        historicalAnalysisModel: "gpt-5-mini",
      },
    });

    expect(merged.aiConfig?.historicalAnalysisModel).toBe("gpt-5-mini");
    expect(merged.aiConfig?.invoiceExtractionModel).toBe("gemini-2.5-pro");
  });
});
