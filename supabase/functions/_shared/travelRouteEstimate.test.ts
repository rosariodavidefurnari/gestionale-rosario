import { describe, expect, it } from "vitest";

import {
  buildTravelRouteDescription,
  validateTravelRouteEstimatePayload,
} from "./travelRouteEstimate.ts";

describe("travelRouteEstimate", () => {
  it("validates and trims a route estimate payload", () => {
    const result = validateTravelRouteEstimatePayload({
      origin: "  Valguarnera Caropepe  ",
      destination: "  Catania  ",
      tripMode: "round_trip",
      kmRate: "0.19",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      origin: "Valguarnera Caropepe",
      destination: "Catania",
      tripMode: "round_trip",
      kmRate: 0.19,
    });
  });

  it("rejects invalid route payloads", () => {
    const result = validateTravelRouteEstimatePayload({
      origin: "Valguarnera Caropepe",
      destination: "",
      tripMode: "unsupported",
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe(
      "Inserisci un luogo di arrivo prima di calcolare i km",
    );
  });

  it("builds a deterministic description for round trips", () => {
    expect(
      buildTravelRouteDescription({
        origin: "Valguarnera Caropepe",
        destination: "Catania",
        tripMode: "round_trip",
      }),
    ).toBe("Spostamento — Valguarnera Caropepe - Catania A/R");
  });
});
