import { describe, expect, it } from "vitest";

import {
  buildPaymentPatchFromQuote,
  shouldClearProjectForClient,
  shouldClearQuoteForClient,
} from "./paymentLinking";

describe("paymentLinking", () => {
  it("autofills client and project from the linked quote without forcing null project", () => {
    expect(
      buildPaymentPatchFromQuote({
        quote: {
          client_id: "client-2",
          project_id: "project-9",
        },
        currentClientId: "client-1",
        currentProjectId: null,
      }),
    ).toEqual({
      client_id: "client-2",
      project_id: "project-9",
    });

    expect(
      buildPaymentPatchFromQuote({
        quote: {
          client_id: "client-2",
          project_id: null,
        },
        currentClientId: "client-2",
        currentProjectId: "project-9",
      }),
    ).toEqual({});
  });

  it("clears incoherent quote/project links when the client changes", () => {
    expect(
      shouldClearQuoteForClient({
        quote: { client_id: "client-2" },
        clientId: "client-1",
      }),
    ).toBe(true);

    expect(
      shouldClearProjectForClient({
        project: { client_id: "client-2" },
        clientId: "client-1",
      }),
    ).toBe(true);

    expect(
      shouldClearQuoteForClient({
        quote: { client_id: "client-2" },
        clientId: "client-2",
      }),
    ).toBe(false);
  });
});
