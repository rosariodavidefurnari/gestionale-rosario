import { describe, expect, it } from "vitest";

import { getProjectQuickEpisodeDefaultsFromSearch } from "./projectQuickEpisodeLinking";

describe("projectQuickEpisodeLinking", () => {
  it("parses launcher defaults for the quick-episode dialog", () => {
    expect(
      getProjectQuickEpisodeDefaultsFromSearch(
        "?project_id=project-7&service_date=2026-02-22&service_type=riprese_montaggio&km_distance=144.8&km_rate=0.19&location=Acireale&notes=Intervista%20a%20Roberto%20Lipari&launcher_source=unified_ai_launcher&launcher_action=project_quick_episode&open_dialog=quick_episode",
      ),
    ).toEqual({
      serviceDate: "2026-02-22",
      serviceType: "riprese_montaggio",
      kmDistance: 144.8,
      kmRate: 0.19,
      location: "Acireale",
      notes: "Intervista a Roberto Lipari",
    });
  });

  it("ignores non quick-episode searches", () => {
    expect(
      getProjectQuickEpisodeDefaultsFromSearch(
        "?launcher_source=unified_ai_launcher&launcher_action=project_quick_payment&open_dialog=quick_payment",
      ),
    ).toBeNull();
  });
});
