import { describe, expect, it } from "vitest";

import {
  buildAnnualOperationsAiGuidance,
  reframeAnnualOperationsQuestion,
} from "./annualOperationsAiGuidance";

const closedYearContext = {
  meta: {
    selectedYear: 2025,
    isCurrentYear: false,
    asOfDateLabel: "28/02/2026",
  },
  metrics: [
    {
      id: "annual_work_value",
      value: 20582,
      formattedValue: "20.582 EUR",
    },
    {
      id: "pending_payments_total",
      value: 0,
      formattedValue: "0 EUR",
    },
    {
      id: "open_quotes_amount",
      value: 0,
      formattedValue: "0 EUR",
    },
  ],
  topClients: [
    {
      clientName: "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
      revenue: 20582,
    },
  ],
};

describe("buildAnnualOperationsAiGuidance", () => {
  it("hardens closed-year interpretation so zeros are not treated as automatic problems", () => {
    const guidance = buildAnnualOperationsAiGuidance({
      mode: "answer",
      context: closedYearContext,
      question: "Qual è il punto più debole da controllare?",
    });

    expect(guidance).toContain(
      'Parla sempre di "nei dati registrati per il 2025" oppure "nel perimetro del 2025".',
    );
    expect(guidance).toContain(
      `Se i pagamenti da ricevere sono 0, limita la frase a "nel perimetro del 2025 non risultano incassi attesi aperti". Non chiamarlo problema automatico.`,
    );
    expect(guidance).toContain(
      'Se la domanda cerca un punto debole, rispondi come "segnale piu fragile visibile nei dati", non come verdetto assoluto sull\'azienda.',
    );
    expect(guidance).toContain(
      "In questo contesto il segnale fragile piu supportato e la concentrazione su un solo cliente (ASSOCIAZIONE CULTURALE GUSTARE SICILIA), non i valori a 0 da soli.",
    );
  });

  it("pushes trainando questions toward positive drivers instead of generic alarms", () => {
    const guidance = buildAnnualOperationsAiGuidance({
      mode: "answer",
      context: closedYearContext,
      question: "Cosa sta trainando quest'anno?",
    });

    expect(guidance).toContain(
      "La domanda chiede cosa sta trainando: concentrati sui driver positivi dimostrabili come categoria principale, cliente dominante e mesi piu forti.",
    );
    expect(guidance).toContain(
      "Non chiudere la risposta con allarmi su zeri o mancanze se la domanda non lo chiede.",
    );
  });

  it("reframes ambiguous annual questions into safer internal instructions", () => {
    const weakPointQuestion = reframeAnnualOperationsQuestion({
      context: closedYearContext,
      question: "Qual è il punto più debole da controllare?",
    });
    const paymentsQuestion = reframeAnnualOperationsQuestion({
      context: closedYearContext,
      question: "Cosa raccontano pagamenti e preventivi aperti?",
    });

    expect(weakPointQuestion).toContain(
      "Qual e il segnale piu fragile visibile nei dati registrati per il 2025?",
    );
    expect(weakPointQuestion).toContain(
      "Non trattare valori a 0, da soli, come problemi automatici",
    );
    expect(paymentsQuestion).toContain(
      "Descrivi i dati senza inferire problemi nascosti o registrazioni mancanti partendo da valori a 0.",
    );
  });
});
