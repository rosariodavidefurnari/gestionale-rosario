import type { LabeledValue } from "@/components/atomic-crm/types";

export const defaultInvoiceExtractionModel = "gemini-2.5-pro";

export const invoiceExtractionModelChoices: LabeledValue[] = [
  {
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Consigliato per fatture, OCR e documenti con layout variabili.",
  },
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Più rapido, utile se vuoi ridurre latenza e costo.",
  },
];
