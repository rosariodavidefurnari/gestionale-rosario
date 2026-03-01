import { describe, expect, it } from "vitest";

import {
  parseInvoiceImportModelResponse,
  validateInvoiceImportExtractPayload,
} from "./invoiceImportExtract.ts";

describe("invoiceImportExtract", () => {
  it("validates the extraction payload", () => {
    const result = validateInvoiceImportExtractPayload({
      model: "gemini-2.5-pro",
      files: [
        {
          path: "ai-invoice-imports/file.pdf",
          name: "file.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
        },
      ],
    });

    expect(result.error).toBeNull();
    expect(result.data?.files).toHaveLength(1);
  });

  it("normalizes the model response into a draft", () => {
    const draft = parseInvoiceImportModelResponse({
      model: "gemini-2.5-pro",
      responseText: JSON.stringify({
        summary: "Bozza pronta",
        warnings: ["Controlla il cliente"],
        records: [
          {
            sourceFileNames: ["fattura-1.pdf"],
            resource: "payments",
            confidence: "medium",
            documentType: "customer_invoice",
            billingName: "LAURUS S.R.L.",
            vatNumber: "12345678901",
            billingCity: "Catania",
            amount: 1200,
            paymentType: "saldo",
            paymentStatus: "in_attesa",
          },
        ],
      }),
    });

    expect(draft.model).toBe("gemini-2.5-pro");
    expect(draft.records[0]?.id).toBe("invoice-draft-1");
    expect(draft.records[0]?.resource).toBe("payments");
    expect(draft.records[0]?.billingName).toBe("LAURUS S.R.L.");
    expect(draft.records[0]?.vatNumber).toBe("12345678901");
    expect(draft.records[0]?.billingCity).toBe("Catania");
  });
});
