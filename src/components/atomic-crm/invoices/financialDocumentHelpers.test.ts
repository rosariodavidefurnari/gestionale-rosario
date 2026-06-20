import { describe, it, expect } from "vitest";
import {
  deriveDocumentCollectionState,
  groupPaymentsByDocument,
  isCreditNote,
  signedTotal,
  documentTypeLabel,
  directionLabel,
  formatEur,
  summarizeFinancialDocuments,
} from "./financialDocumentHelpers";
import type { FinancialDocumentSummary } from "../types";

describe("deriveDocumentCollectionState", () => {
  it("is neutral when there are no linked payments (historical doc)", () => {
    expect(deriveDocumentCollectionState([])).toEqual({
      label: "—",
      tone: "neutral",
    });
    expect(deriveDocumentCollectionState(null)).toEqual({
      label: "—",
      tone: "neutral",
    });
  });

  it("is 'Da incassare' for a single expected payment (just emitted)", () => {
    expect(deriveDocumentCollectionState([{ status: "in_attesa" }])).toEqual({
      label: "Da incassare",
      tone: "pending",
    });
  });

  it("is 'Incassata' once the linked payment is received", () => {
    expect(deriveDocumentCollectionState([{ status: "ricevuto" }])).toEqual({
      label: "Incassata",
      tone: "settled",
    });
  });

  it("flags overdue", () => {
    expect(deriveDocumentCollectionState([{ status: "scaduto" }]).tone).toBe(
      "overdue",
    );
  });

  it("is 'Parziale' for a mix of received and pending", () => {
    expect(
      deriveDocumentCollectionState([
        { status: "ricevuto" },
        { status: "in_attesa" },
      ]),
    ).toEqual({ label: "Parziale", tone: "pending" });
  });

  it("scaduto wins over the final 'Da incassare' fallback (in_attesa + scaduto)", () => {
    // Precedence: not-all-received, none received -> scaduto checked before
    // the Da incassare fallback -> Scaduta.
    expect(
      deriveDocumentCollectionState([
        { status: "in_attesa" },
        { status: "scaduto" },
      ]).label,
    ).toBe("Scaduta");
  });

  it("'Parziale' wins when one received + one overdue (received checked before overdue)", () => {
    // some(ricevuto) is evaluated before some(scaduto): a doc with one received
    // and one overdue payment is 'Parziale', not 'Scaduta'.
    expect(
      deriveDocumentCollectionState([
        { status: "ricevuto" },
        { status: "scaduto" },
      ]).label,
    ).toBe("Parziale");
  });
});

describe("groupPaymentsByDocument", () => {
  type P = {
    id: string;
    status: string;
    financial_document_id?: string | null;
  };

  it("groups payments by financial_document_id", () => {
    const payments: P[] = [
      { id: "p1", status: "ricevuto", financial_document_id: "doc-a" },
      { id: "p2", status: "in_attesa", financial_document_id: "doc-a" },
      { id: "p3", status: "ricevuto", financial_document_id: "doc-b" },
    ];
    const map = groupPaymentsByDocument(payments);
    expect(map.get("doc-a")).toHaveLength(2);
    expect(map.get("doc-b")).toHaveLength(1);
    expect(map.size).toBe(2);
  });

  it("skips unlinked payments (null/undefined financial_document_id)", () => {
    const payments: P[] = [
      { id: "p1", status: "ricevuto", financial_document_id: null },
      { id: "p2", status: "ricevuto" },
      { id: "p3", status: "ricevuto", financial_document_id: "doc-a" },
    ];
    const map = groupPaymentsByDocument(payments);
    expect(map.size).toBe(1);
    expect(map.get("doc-a")).toHaveLength(1);
  });

  it("a doc with no linked payment is absent -> deriveDocumentCollectionState gives neutral", () => {
    const map = groupPaymentsByDocument<P>([]);
    expect(map.get("doc-x")).toBeUndefined();
    expect(deriveDocumentCollectionState(map.get("doc-x")).tone).toBe(
      "neutral",
    );
  });

  it("coerces non-string ids via String() for stable keying", () => {
    const payments = [
      {
        id: "p1",
        status: "ricevuto",
        financial_document_id: 42 as unknown as string,
      },
    ];
    const map = groupPaymentsByDocument(payments);
    expect(map.get("42")).toHaveLength(1);
  });
});

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

  it('formatEur(-0) === "0,00 €" (no negative zero)', () => {
    expect(formatEur(-0)).toBe("0,00 €");
  });

  it('formatEur(-0.0001) === "0,00 €" (negative residual rounds to 0, no "-0,00 €")', () => {
    // A tiny negative residual (e.g. credit note net == invoice) rounds to 0
    // and must never render with a minus sign.
    expect(formatEur(-0.0001)).toBe("0,00 €");
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

  it("vista 'Tutte' con EUR+USD su entrambe le direzioni → multiCurrency=true, byCurrency separato per direzione", () => {
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
      doc({
        direction: "inbound",
        document_type: "supplier_invoice",
        document_number: "SF1",
        issue_date: "2025-03-01",
        total_amount: 300,
        taxable_amount: 300,
        currency_code: "EUR",
      }),
      doc({
        direction: "inbound",
        document_type: "supplier_invoice",
        document_number: "SF2",
        issue_date: "2025-04-01",
        total_amount: 120,
        taxable_amount: 120,
        currency_code: "USD",
      }),
    ];
    const result = summarizeFinancialDocuments(docs);
    expect(result.multiCurrency).toBe(true);
    expect(result.outbound.byCurrency["EUR"].netTotal).toBe(1000);
    expect(result.outbound.byCurrency["USD"].netTotal).toBe(500);
    expect(result.inbound.byCurrency["EUR"].netTotal).toBe(300);
    expect(result.inbound.byCurrency["USD"].netTotal).toBe(120);
  });
});
