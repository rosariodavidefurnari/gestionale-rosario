import { describe, expect, it } from "vitest";

import { validateQuoteStatusEmailSendPayload } from "./quoteStatusEmailSend";

describe("quoteStatusEmailSend", () => {
  it("rejects automatic sends whenever the flow contains non-taxable services", () => {
    expect(
      validateQuoteStatusEmailSendPayload({
        to: "cliente@example.com",
        subject: "Preventivo aggiornato",
        html: "<p>Test</p>",
        text: "Test",
        templateId: "quote-status.accettato",
        status: "accettato",
        automatic: true,
        hasNonTaxableServices: true,
      }),
    ).toContain("is_taxable = false");
  });

  it("requires the core payload before attempting SMTP delivery", () => {
    expect(
      validateQuoteStatusEmailSendPayload({
        to: "",
        subject: " ",
        html: "",
        text: "",
        templateId: "",
        status: "",
      }),
    ).toBe("Destinatario mail cliente mancante.");

    expect(
      validateQuoteStatusEmailSendPayload({
        to: "cliente@example.com",
        subject: "Preventivo aggiornato",
        html: "<p>Test</p>",
        text: "Test",
        templateId: "quote-status.accettato",
        status: "accettato",
      }),
    ).toBeNull();
  });
});
