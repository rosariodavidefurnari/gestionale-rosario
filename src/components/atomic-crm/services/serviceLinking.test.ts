import { describe, expect, it } from "vitest";

import {
  buildServiceCreatePathFromProject,
  getServiceCreateDefaultsFromSearch,
  getUnifiedAiServiceBannerCopy,
  getUnifiedAiServiceHandoffContextFromSearch,
} from "./serviceLinking";

describe("serviceLinking", () => {
  it("reads service prefills from launcher search params", () => {
    expect(
      getServiceCreateDefaultsFromSearch(
        "?project_id=project-9&service_date=2026-03-01&service_type=fotografia&km_distance=32.5&km_rate=0.19&location=Catania&notes=Scatti%20evento&launcher_source=unified_ai_launcher&launcher_action=service_create",
      ),
    ).toEqual({
      project_id: "project-9",
      service_date: "2026-03-01",
      service_type: "fotografia",
      km_distance: 32.5,
      km_rate: 0.19,
      location: "Catania",
      notes: "Scatti evento",
    });
  });

  it("extracts launcher handoff context for generic service creation", () => {
    expect(
      getUnifiedAiServiceHandoffContextFromSearch(
        "?launcher_source=unified_ai_launcher&launcher_action=service_create",
      ),
    ).toEqual({
      source: "unified_ai_launcher",
      action: "service_create",
    });
  });

  it("builds a launcher banner for generic service creation", () => {
    expect(
      getUnifiedAiServiceBannerCopy(
        "?launcher_source=unified_ai_launcher&launcher_action=service_create",
      ),
    ).toContain("servizio gia collegato al progetto corretto");
  });

  it("builds a create path for generic project services", () => {
    expect(
      buildServiceCreatePathFromProject({
        project_id: "project-9",
        service_date: "2026-03-01",
        service_type: "fotografia",
        km_distance: 32.5,
        km_rate: 0.19,
        location: "Catania",
        notes: "Scatti evento",
      }),
    ).toBe(
      "/services/create?launcher_source=unified_ai_launcher&launcher_action=service_create&project_id=project-9&service_date=2026-03-01&service_type=fotografia&km_distance=32.5&km_rate=0.19&location=Catania&notes=Scatti+evento",
    );
  });
});
