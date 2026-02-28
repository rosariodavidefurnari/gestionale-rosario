import { describe, expect, it } from "vitest";

import {
  buildPaymentCreateDefaultsFromClient,
  buildPaymentCreatePathFromClient,
  buildPaymentCreateDefaultsFromQuote,
  buildPaymentCreatePathFromQuote,
  canCreatePaymentFromQuote,
  buildQuoteSearchFilter,
  buildPaymentPatchFromQuote,
  getPaymentCreateDefaultsFromSearch,
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

  it("builds a quote reference search filter on the quote description", () => {
    expect(buildQuoteSearchFilter("  Diego TV  ")).toEqual({
      "description@ilike": "%Diego TV%",
    });
    expect(buildQuoteSearchFilter("   ")).toEqual({});
  });

  it("builds quick-payment defaults and path from a quote", () => {
    expect(
      buildPaymentCreateDefaultsFromQuote({
        quote: {
          id: "quote-7",
          client_id: "client-2",
          project_id: "project-9",
        },
      }),
    ).toEqual({
      quote_id: "quote-7",
      client_id: "client-2",
      project_id: "project-9",
    });

    expect(
      buildPaymentCreatePathFromQuote({
        quote: {
          id: "quote-7",
          client_id: "client-2",
          project_id: "project-9",
        },
      }),
    ).toBe(
      "/payments/create?quote_id=quote-7&client_id=client-2&project_id=project-9",
    );
  });

  it("builds direct-payment defaults and path from a client", () => {
    expect(
      buildPaymentCreateDefaultsFromClient({
        client: {
          client_id: "client-2",
        },
      }),
    ).toEqual({
      client_id: "client-2",
    });

    expect(
      buildPaymentCreatePathFromClient({
        client: {
          client_id: "client-2",
        },
      }),
    ).toBe("/payments/create?client_id=client-2");
  });

  it("parses quick-payment defaults from the create URL search params", () => {
    expect(
      getPaymentCreateDefaultsFromSearch(
        "?quote_id=quote-7&client_id=client-2&project_id=project-9",
      ),
    ).toEqual({
      quote_id: "quote-7",
      client_id: "client-2",
      project_id: "project-9",
    });

    expect(getPaymentCreateDefaultsFromSearch("?quote_id=quote-7")).toEqual({
      quote_id: "quote-7",
    });

    expect(getPaymentCreateDefaultsFromSearch("?client_id=client-2")).toEqual({
      client_id: "client-2",
    });
  });

  it("only shows quick payment for operational quote statuses that can still receive payments", () => {
    expect(
      canCreatePaymentFromQuote({
        status: "accettato",
        client_id: "client-1",
      }),
    ).toBe(true);
    expect(
      canCreatePaymentFromQuote({
        status: "preventivo_inviato",
        client_id: "client-1",
      }),
    ).toBe(false);
    expect(
      canCreatePaymentFromQuote({
        status: "saldato",
        client_id: "client-1",
      }),
    ).toBe(false);
  });
});
