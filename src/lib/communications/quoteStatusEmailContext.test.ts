import { describe, expect, it } from "vitest";

import {
  buildQuoteStatusEmailContext,
  buildQuoteStatusEmailTemplateFromContext,
} from "./quoteStatusEmailContext";

describe("quoteStatusEmailContext", () => {
  it("builds a customer-facing email context from quote, payments, services, and configuration", () => {
    const context = buildQuoteStatusEmailContext({
      quote: {
        id: "quote-1",
        client_id: "client-1",
        project_id: "project-1",
        service_type: "wedding",
        status: "acconto_ricevuto",
        description: "Wedding completo",
        amount: 1800,
        event_start: "2026-06-20",
        event_end: "2026-06-20",
        all_day: true,
        sent_date: "2026-03-01",
        response_date: "2026-03-04",
      },
      client: {
        name: "Maria Rossi",
        email: "maria@example.com",
      },
      project: {
        name: "Wedding Maria e Luca",
      },
      payments: [
        {
          amount: 200,
          payment_type: "acconto",
          payment_date: "2026-03-10",
          status: "ricevuto",
        },
        {
          amount: 300,
          payment_type: "saldo",
          payment_date: "2026-03-15",
          status: "in_attesa",
        },
        {
          amount: 100,
          payment_type: "parziale",
          payment_date: "2026-02-20",
          status: "ricevuto",
        },
      ],
      services: [
        { is_taxable: true },
        { is_taxable: false },
      ],
      configuration: {
        title: "Studio Rosario",
        quoteServiceTypes: [
          {
            value: "wedding",
            label: "Wedding",
          },
        ],
      },
    });

    expect(context.businessName).toBe("Studio Rosario");
    expect(context.serviceLabel).toBe("Wedding");
    expect(context.projectName).toBe("Wedding Maria e Luca");
    expect(context.amountPaid).toBe(300);
    expect(context.latestReceivedPaymentAmount).toBe(200);
    expect(context.amountDue).toBe(1500);
    expect(context.hasNonTaxableServices).toBe(true);
  });

  it("keeps due aligned to received payments only and can render a sendable template", () => {
    const context = buildQuoteStatusEmailContext({
      quote: {
        id: "quote-2",
        client_id: "client-2",
        project_id: null,
        service_type: "custom_service",
        status: "in_trattativa",
        description: "Sito vetrina",
        amount: 1200,
        all_day: true,
      },
      client: {
        name: "Cliente Test",
        email: "cliente@example.com",
      },
      payments: [
        {
          amount: 400,
          payment_type: "parziale",
          payment_date: "2026-04-10",
          status: "in_attesa",
        },
      ],
    });

    const template = buildQuoteStatusEmailTemplateFromContext(context, {
      customMessage: "Sto allineando gli ultimi dettagli.",
    });

    expect(context.serviceLabel).toBe("custom_service");
    expect(context.amountPaid).toBeNull();
    expect(context.amountDue).toBe(1200);
    expect(template.canSend).toBe(true);
    expect(template.text).toContain("Sto allineando gli ultimi dettagli.");
  });
});
