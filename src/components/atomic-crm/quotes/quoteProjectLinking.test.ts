import { describe, expect, it } from "vitest";

import {
  buildProjectDraftFromQuote,
  canCreateProjectFromQuote,
  getSuggestedProjectCategoryFromQuote,
  getSuggestedProjectNameFromQuote,
} from "./quoteProjectLinking";

describe("quoteProjectLinking", () => {
  it("builds a project draft with safe defaults from a quote", () => {
    const draft = buildProjectDraftFromQuote({
      quote: {
        client_id: "client-1",
        service_type: "produzione_tv",
        description: "Bella tra i Fornelli - Puntata 12",
        event_start: "2026-03-10",
        event_end: "2026-03-12",
        all_day: true,
        amount: 1800,
      },
      clientName: "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
    });

    expect(draft).toMatchObject({
      client_id: "client-1",
      name: "Bella tra i Fornelli - Puntata 12 - ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
      category: "produzione_tv",
      status: "in_corso",
      start_date: "2026-03-10",
      end_date: "2026-03-12",
      all_day: true,
      budget: 1800,
    });
  });

  it("keeps ambiguous quote service types without forced category defaults", () => {
    expect(getSuggestedProjectCategoryFromQuote("battesimo")).toBeUndefined();
    expect(getSuggestedProjectCategoryFromQuote("evento")).toBeUndefined();
    expect(getSuggestedProjectCategoryFromQuote("wedding")).toBe("wedding");
  });

  it("only allows project creation for operational quote statuses without existing project link", () => {
    expect(
      canCreateProjectFromQuote({
        status: "accettato",
        project_id: null,
      }),
    ).toBe(true);
    expect(
      canCreateProjectFromQuote({
        status: "primo_contatto",
        project_id: null,
      }),
    ).toBe(false);
    expect(
      canCreateProjectFromQuote({
        status: "accettato",
        project_id: "project-1",
      }),
    ).toBe(false);
  });

  it("builds a resilient fallback name when description is missing", () => {
    expect(
      getSuggestedProjectNameFromQuote({
        clientName: "Cliente Test",
      }),
    ).toBe("Progetto Cliente Test");
  });
});
