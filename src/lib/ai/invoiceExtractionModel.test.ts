import { describe, expect, it } from "vitest";

import {
  defaultInvoiceExtractionModel,
  invoiceExtractionModelChoices,
} from "./invoiceExtractionModel";

describe("invoiceExtractionModel", () => {
  it("defaults to gemini-2.5-pro for invoice OCR work", () => {
    expect(defaultInvoiceExtractionModel).toBe("gemini-2.5-pro");
    expect(
      invoiceExtractionModelChoices.some(
        (choice) =>
          choice.value === "gemini-2.5-pro" &&
          choice.description?.includes("OCR"),
      ),
    ).toBe(true);
  });
});
