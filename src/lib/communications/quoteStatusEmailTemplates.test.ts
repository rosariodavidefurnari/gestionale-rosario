import { describe, expect, it } from "vitest";

import {
  buildQuoteStatusEmailTemplate,
  getQuoteStatusEmailTemplateDefinition,
} from "./quoteStatusEmailTemplates";

describe("quoteStatusEmailTemplates", () => {
  it("builds a coherent client-facing template for preventivo inviato", () => {
    const template = buildQuoteStatusEmailTemplate({
      quote: {
        status: "preventivo_inviato",
        description: "Wedding completo",
        amount: 1800,
        event_start: "2026-06-20",
        event_end: "2026-06-20",
        all_day: true,
      },
      client: {
        name: "Maria Rossi",
        email: "maria@example.com",
      },
      serviceLabel: "Wedding",
      publicQuoteUrl: "https://example.com/quote/wedding",
      supportEmail: "studio@example.com",
    });

    expect(template.canSend).toBe(true);
    expect(template.automaticSendAllowed).toBe(true);
    expect(template.subject).toContain("Wedding completo");
    expect(template.text).toContain("Maria Rossi");
    expect(template.text).toContain("Apri il preventivo");
    expect(template.html).toContain("Wedding completo");
    expect(template.html).toContain("https://example.com/quote/wedding");
  });

  it("keeps internal-only statuses out of automatic client email flows", () => {
    const definition = getQuoteStatusEmailTemplateDefinition("primo_contatto");
    const template = buildQuoteStatusEmailTemplate({
      quote: {
        status: "primo_contatto",
        description: "Lead wedding",
        amount: 0,
        all_day: true,
      },
      client: {
        name: "Cliente",
        email: "cliente@example.com",
      },
    });

    expect(definition.sendPolicy).toBe("never");
    expect(template.canSend).toBe(false);
    expect(template.automaticSendAllowed).toBe(false);
  });

  it("marks missing dynamic data when a status email cannot be sent safely", () => {
    const template = buildQuoteStatusEmailTemplate({
      quote: {
        status: "preventivo_inviato",
        description: "",
        amount: 1200,
        all_day: true,
      },
      client: {
        name: "Cliente senza email",
        email: "",
      },
    });

    expect(template.canSend).toBe(false);
    expect(template.automaticSendAllowed).toBe(false);
    expect(template.missingFields).toEqual([
      "client_email",
      "quote_description",
    ]);
  });

  it("blocks automatic emails whenever linked services are non-taxable", () => {
    const template = buildQuoteStatusEmailTemplate({
      quote: {
        status: "accettato",
        description: "Servizio speciale",
        amount: 900,
        all_day: true,
      },
      client: {
        name: "Cliente Test",
        email: "cliente@example.com",
      },
      hasNonTaxableServices: true,
    });

    expect(template.canSend).toBe(true);
    expect(template.automaticSendAllowed).toBe(false);
    expect(template.automaticSendBlockReason).toContain("is_taxable = false");
  });
});
