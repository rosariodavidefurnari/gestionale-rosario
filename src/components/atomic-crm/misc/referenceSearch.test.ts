import { describe, expect, it } from "vitest";

import { buildNameSearchFilter } from "./referenceSearch";

describe("referenceSearch", () => {
  it("builds an ilike filter for name-based reference lookups", () => {
    expect(buildNameSearchFilter("  Diego  ")).toEqual({
      "name@ilike": "%Diego%",
    });
    expect(buildNameSearchFilter("   ")).toEqual({});
  });
});
