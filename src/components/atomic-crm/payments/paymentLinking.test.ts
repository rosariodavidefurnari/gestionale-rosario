import { describe, expect, it } from "vitest";

import {
  buildPaymentCreateDefaultsFromClient,
  buildPaymentCreatePathFromClient,
  buildPaymentCreateDefaultsFromQuote,
  buildPaymentCreatePathFromQuote,
  buildPaymentCreatePathFromDraft,
  canCreatePaymentFromQuote,
  buildQuoteSearchFilter,
  buildPaymentPatchFromQuote,
  getPaymentCreateDefaultsFromSearch,
  getSuggestedPaymentAmountFromQuote,
  getUnifiedAiHandoffContextFromSearch,
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

    expect(
      getPaymentCreateDefaultsFromSearch(
        "?quote_id=quote-7&client_id=client-2&project_id=project-9&payment_type=saldo&amount=450&status=in_attesa&launcher_source=unified_ai_launcher&launcher_action=quote_create_payment&draft_kind=payment_create",
      ),
    ).toEqual({
      quote_id: "quote-7",
      client_id: "client-2",
      project_id: "project-9",
      payment_type: "saldo",
      amount: 450,
      status: "in_attesa",
    });
  });

  it("parses unified AI handoff context from the search params", () => {
    expect(
      getUnifiedAiHandoffContextFromSearch(
        "?launcher_source=unified_ai_launcher&launcher_action=project_quick_payment&open_dialog=quick_payment&payment_type=saldo",
      ),
    ).toEqual({
      source: "unified_ai_launcher",
      action: "project_quick_payment",
      openDialog: "quick_payment",
      paymentType: "saldo",
      draftKind: null,
    });

    expect(getUnifiedAiHandoffContextFromSearch("?client_id=client-2")).toBeNull();
  });

  it("builds a payment-create path from an editable launcher draft", () => {
    expect(
      buildPaymentCreatePathFromDraft({
        draft: {
          quote_id: "quote-7",
          client_id: "client-2",
          project_id: "project-9",
          payment_type: "saldo",
          amount: 450,
          status: "in_attesa",
          launcherAction: "quote_create_payment",
          draftKind: "payment_create",
        },
      }),
    ).toBe(
      "/payments/create?quote_id=quote-7&client_id=client-2&project_id=project-9&payment_type=saldo&amount=450&status=in_attesa&launcher_source=unified_ai_launcher&launcher_action=quote_create_payment&draft_kind=payment_create",
    );
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

  it("suggests the still-unlinked quote amount for standard payment types", () => {
    expect(
      getSuggestedPaymentAmountFromQuote({
        quoteAmount: 1000,
        paymentType: "saldo",
        payments: [
          { amount: 200, payment_type: "acconto", status: "ricevuto" },
          { amount: 300, payment_type: "parziale", status: "in_attesa" },
        ],
      }),
    ).toBe(500);

    expect(
      getSuggestedPaymentAmountFromQuote({
        quoteAmount: 1000,
        paymentType: "rimborso_spese",
        payments: [],
      }),
    ).toBeNull();

    expect(
      getSuggestedPaymentAmountFromQuote({
        quoteAmount: 500,
        paymentType: "saldo",
        payments: [
          { amount: 300, payment_type: "acconto", status: "ricevuto" },
          { amount: 300, payment_type: "saldo", status: "in_attesa" },
        ],
      }),
    ).toBeNull();
  });
});
