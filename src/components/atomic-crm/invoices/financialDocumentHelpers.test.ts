import { describe, it, expect } from "vitest";
import {
  isCreditNote,
  signedTotal,
  documentTypeLabel,
  directionLabel,
  formatEur,
  summarizeFinancialDocuments,
} from "./financialDocumentHelpers";
import type { FinancialDocumentSummary } from "../types";

// Defaults for optional fields — kept separate to stay under complexity limit.
const DOC_DEFAULTS: Omit<
  FinancialDocumentSummary,
  | "direction"
  | "document_type"
  | "document_number"
  | "issue_date"
  | "total_amount"
> = {
  id: "test-id",
  settled_amount: 0,
  open_amount: 0,
  settlement_status: "open",
  project_allocations_count: 0,
  currency_code: "EUR",
  created_at: "",
  updated_at: "",
  taxable_amount: null,
  tax_amount: null,
  stamp_amount: null,
  client_id: null,
  supplier_id: null,
  client_name: null,
  supplier_name: null,
  due_date: null,
  related_document_number: null,
  xml_document_code: null,
  project_names: null,
  source_path: null,
  notes: null,
};

// Factory: costruisce un FinancialDocumentSummary valido con override parziali
const doc = (
  partial: Partial<FinancialDocumentSummary> &
    Pick<
      FinancialDocumentSummary,
      | "direction"
      | "document_type"
      | "document_number"
      | "issue_date"
      | "total_amount"
    >,
): FinancialDocumentSummary => ({ ...DOC_DEFAULTS, ...partial });

// ---------------------------------------------------------------------------
describe("isCreditNote", () => {
  it("returns true for customer_credit_note", () => {
    const d = doc({
      direction: "outbound",
      document_type: "customer_credit_note",
      document_number: "NC1",
      issue_date: "2025-01-01",
      total_amount: 200,
    });
    expect(isCreditNote(d)).toBe(true);
  });

  it("returns true for supplier_credit_note", () => {
    const d = doc({
      direction: "inbound",
      document_type: "supplier_credit_note",
      document_number: "NC2",
      issue_date: "2025-01-01",
      total_amount: 100,
    });
    expect(isCreditNote(d)).toBe(true);
  });

  it("returns false for customer_invoice", () => {
    const d = doc({
      direction: "outbound",
      document_type: "customer_invoice",
      document_number: "F1",
      issue_date: "2025-01-01",
      total_amount: 500,
    });
    expect(isCreditNote(d)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("signedTotal", () => {
  it("customer_invoice 100 → 100", () => {
    const d = doc({
      direction: "outbound",
      document_type: "customer_invoice",
      document_number: "F1",
      issue_date: "2025-01-01",
      total_amount: 100,
    });
    expect(signedTotal(d)).toBe(100);
  });

  it("customer_credit_note con total 200 → -200", () => {
    const d = doc({
      direction: "outbound",
      document_type: "customer_credit_note",
      document_number: "NC1",
      issue_date: "2025-01-01",
      total_amount: 200,
    });
    expect(signedTotal(d)).toBe(-200);
  });

  it("customer_credit_note con total -200 → -200 (no doppia inversione)", () => {
    const d = doc({
      direction: "outbound",
      document_type: "customer_credit_note",
      document_number: "NC2",
      issue_date: "2025-01-01",
      total_amount: -200,
    });
    expect(signedTotal(d)).toBe(-200);
  });
});

// ---------------------------------------------------------------------------
describe("documentTypeLabel", () => {
  it('customer_invoice → "Fattura"', () => {
    expect(documentTypeLabel("customer_invoice")).toBe("Fattura");
  });

  it('supplier_invoice → "Fattura"', () => {
    expect(documentTypeLabel("supplier_invoice")).toBe("Fattura");
  });

  it('customer_credit_note → "Nota di credito"', () => {
    expect(documentTypeLabel("customer_credit_note")).toBe("Nota di credito");
  });

  it('supplier_credit_note → "Nota di credito"', () => {
    expect(documentTypeLabel("supplier_credit_note")).toBe("Nota di credito");
  });
});

// ---------------------------------------------------------------------------
describe("directionLabel", () => {
  it('outbound → "Emessa"', () => {
    expect(directionLabel("outbound")).toBe("Emessa");
  });

  it('inbound → "Ricevuta"', () => {
    expect(directionLabel("inbound")).toBe("Ricevuta");
  });
});

// ---------------------------------------------------------------------------
describe("formatEur", () => {
  it('formatEur(1000) === "1.000,00 €"', () => {
    expect(formatEur(1000)).toBe("1.000,00 €");
  });

  it('formatEur(800) === "800,00 €"', () => {
    expect(formatEur(800)).toBe("800,00 €");
  });

  it('formatEur(50, "USD") === "50,00 USD"', () => {
    expect(formatEur(50, "USD")).toBe("50,00 USD");
  });
});

// ---------------------------------------------------------------------------
describe("summarizeFinancialDocuments", () => {
  it("outbound invoice 1000 + outbound invoice 200 + outbound credit_note 200 → netTotal=1000, taxable=1000, count=3, inbound.count=0", () => {
    const docs = [
      doc({
        direction: "outbound",
        document_type: "customer_invoice",
        document_number: "F1",
        issue_date: "2025-01-01",
        total_amount: 1000,
        taxable_amount: 1000,
      }),
      doc({
        direction: "outbound",
        document_type: "customer_invoice",
        document_number: "F2",
        issue_date: "2025-02-01",
        total_amount: 200,
        taxable_amount: 200,
      }),
      doc({
        direction: "outbound",
        document_type: "customer_credit_note",
        document_number: "NC1",
        issue_date: "2025-03-01",
        total_amount: 200,
        taxable_amount: 200,
      }),
    ];
    const result = summarizeFinancialDocuments(docs);
    expect(result.outbound.netTotal).toBe(1000);
    expect(result.outbound.taxable).toBe(1000);
    expect(result.outbound.count).toBe(3);
    expect(result.inbound.count).toBe(0);
  });

  it("outbound invoice 500, inbound supplier_invoice 300 → direzioni separate", () => {
    const docs = [
      doc({
        direction: "outbound",
        document_type: "customer_invoice",
        document_number: "F1",
        issue_date: "2025-01-01",
        total_amount: 500,
        taxable_amount: 500,
      }),
      doc({
        direction: "inbound",
        document_type: "supplier_invoice",
        document_number: "SF1",
        issue_date: "2025-01-05",
        total_amount: 300,
        taxable_amount: 300,
      }),
    ];
    const result = summarizeFinancialDocuments(docs);
    expect(result.outbound.netTotal).toBe(500);
    expect(result.inbound.netTotal).toBe(300);
  });

  it("valute EUR+USD → multiCurrency=true, byCurrency separato", () => {
    const docs = [
      doc({
        direction: "outbound",
        document_type: "customer_invoice",
        document_number: "F1",
        issue_date: "2025-01-01",
        total_amount: 1000,
        taxable_amount: 1000,
        currency_code: "EUR",
      }),
      doc({
        direction: "outbound",
        document_type: "customer_invoice",
        document_number: "F2",
        issue_date: "2025-02-01",
        total_amount: 500,
        taxable_amount: 500,
        currency_code: "USD",
      }),
    ];
    const result = summarizeFinancialDocuments(docs);
    expect(result.multiCurrency).toBe(true);
    expect(result.outbound.byCurrency["EUR"].netTotal).toBe(1000);
    expect(result.outbound.byCurrency["USD"].netTotal).toBe(500);
  });
});
