// @vitest-environment jsdom

// Task 7b controller (UI-7 parity + falsifiable): proves the Fatture LIST renders
// the collection-state badge derived from linked payments on BOTH the desktop row
// AND the mobile card, and renders a neutral "—" for documents with no linked
// payment. Falsifiable: remove the badge wiring from the desktop row -> the
// desktop "Incassata" assertion fails; remove it from the mobile card -> the
// mobile assertion fails (the two surfaces are asserted independently).

import "@/setupTests";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FinancialDocumentSummary } from "../types";

const mockUseListContext = vi.fn();
const mockUseGetList = vi.fn();
const mockIsMobile = vi.fn();

vi.mock("ra-core", () => ({
  useListContext: () => mockUseListContext(),
  useGetList: () => mockUseGetList(),
  useCreatePath:
    () =>
    ({ id }: { id: string }) =>
      `/financial_documents_summary/${id}/show`,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobile(),
}));

// cv passthrough: never hides a column (so "collection" is always rendered).
vi.mock("@/hooks/useColumnVisibility", () => ({
  useColumnVisibility: () => ({
    cv: (_key: string, base?: string) => base ?? "",
    columns: [],
    visibleKeys: [],
    isVisible: () => true,
    toggleColumn: () => {},
  }),
}));

vi.mock("@/hooks/useResizableColumns", () => ({
  useResizableColumns: () => ({
    getWidth: () => undefined,
    onResizeStart: () => {},
    headerRef: { current: null },
  }),
}));

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

import { FinancialDocumentListContent } from "./FinancialDocumentListContent";

const baseDoc: Omit<FinancialDocumentSummary, "id" | "document_number"> = {
  client_id: "c1",
  supplier_id: null,
  client_name: "ACME SRL",
  supplier_name: null,
  direction: "outbound",
  document_type: "customer_invoice",
  related_document_number: null,
  xml_document_code: null,
  issue_date: "2025-03-10",
  due_date: null,
  total_amount: 1000,
  taxable_amount: 1000,
  tax_amount: null,
  stamp_amount: null,
  settled_amount: 0,
  open_amount: 1000,
  settlement_status: "overdue",
  project_allocations_count: 0,
  project_names: null,
  currency_code: "EUR",
  source_path: null,
  notes: null,
  created_at: "",
  updated_at: "",
};

const docs: FinancialDocumentSummary[] = [
  { ...baseDoc, id: "d1", document_number: "FPR 1/25" }, // has a received payment -> Incassata
  { ...baseDoc, id: "d2", document_number: "FPR 2/25" }, // no linked payment -> neutral "—"
];

const payments = [
  { id: "p1", status: "ricevuto", financial_document_id: "d1" },
];

const setList = () => {
  mockUseListContext.mockReturnValue({
    data: docs,
    isPending: false,
    error: null,
  });
  mockUseGetList.mockReturnValue({ data: payments });
};

describe("FinancialDocumentListContent collection badge (Task 7b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setList();
  });

  it("desktop: renders the 'Incasso' column with 'Incassata' for a paid doc and '—' for a neutral doc", () => {
    mockIsMobile.mockReturnValue(false);

    render(<FinancialDocumentListContent />);

    // column header present
    expect(screen.getByText("Incasso")).toBeInTheDocument();
    // d1 paid -> Incassata badge (proves desktop row wiring)
    expect(screen.getByText("Incassata")).toBeInTheDocument();
    // d2 unpaid -> neutral em-dash cell (visible, not empty)
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("mobile: card shows the same 'Incassata' badge (UI-7 parity) and a neutral label for the unpaid doc", () => {
    mockIsMobile.mockReturnValue(true);

    render(<FinancialDocumentListContent />);

    // d1 paid -> Incassata badge in the mobile card (proves mobile wiring)
    expect(screen.getByText("Incassata")).toBeInTheDocument();
    // d2 unpaid -> neutral mobile label
    expect(screen.getByText("Incasso —")).toBeInTheDocument();
  });

  it("neutral when payments are still loading (undefined) -> no badge, no crash", async () => {
    mockIsMobile.mockReturnValue(false);
    mockUseGetList.mockReturnValue({ data: undefined });

    render(<FinancialDocumentListContent />);

    // both docs neutral while payments load. findAllByText retries -> robust
    // against parallel cold-start render timing. Scoped to the table body so a
    // stray em-dash elsewhere can't satisfy the count.
    expect(screen.queryByText("Incassata")).not.toBeInTheDocument();
    const tbody = document.querySelector("tbody");
    const neutral = await screen.findAllByText("—");
    const inBody = neutral.filter((el) => tbody?.contains(el));
    expect(inBody.length).toBe(2);
  });
});
