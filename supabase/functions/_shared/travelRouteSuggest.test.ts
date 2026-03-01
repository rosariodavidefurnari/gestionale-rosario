import { describe, expect, it } from "vitest";

import { validateTravelRouteSuggestPayload } from "./travelRouteSuggest.ts";

describe("travelRouteSuggest", () => {
  it("validates and trims a location-suggest payload", () => {
    const result = validateTravelRouteSuggestPayload({
      query: "  Valguarnera  ",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      query: "Valguarnera",
    });
  });

  it("rejects too-short queries", () => {
    const result = validateTravelRouteSuggestPayload({
      query: "ca",
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe("Scrivi almeno 3 caratteri per cercare un luogo");
  });
});
