/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { InvoiceDraftInput } from "./invoiceDraftTypes";
import { InvoiceDraftDialog } from "./InvoiceDraftDialog";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("../root/ConfigurationContext", () => ({
  useConfigurationContext: () => ({
    businessProfile: {},
  }),
}));

vi.mock("ra-core", () => ({
  useGetList: () => ({ data: [] }),
  useNotify: () => vi.fn(),
  useRefresh: () => vi.fn(),
}));

vi.mock("./useEmitInvoice", () => ({
  useEmitInvoice: () => ({
    emit: vi.fn(),
    isEmitting: false,
  }),
  getInvoiceEmitGate: () => ({
    isEmittableSource: false,
    canEmit: false,
    blockedReason: null,
  }),
}));

const emptyClientDraft: InvoiceDraftInput = {
  client: {
    id: "client-1",
    name: "Cliente Uno",
  } as InvoiceDraftInput["client"],
  source: {
    kind: "client",
    id: "client-1",
    label: "Cliente Uno",
  },
  lineItems: [],
};

describe("InvoiceDraftDialog empty state", () => {
  it("gives operational links when every source item is already invoiced", () => {
    render(
      <MemoryRouter>
        <InvoiceDraftDialog
          open
          onOpenChange={vi.fn()}
          draft={emptyClientDraft}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Nessuna voce residua da fatturare per questo cliente."),
    ).toBeTruthy();

    expect(
      screen
        .getByRole("link", { name: /Registro lavori/ })
        .getAttribute("href"),
    ).toBe('/services?filter={"client_id@eq":"client-1"}');
    expect(
      screen.getByRole("link", { name: /Spese/ }).getAttribute("href"),
    ).toBe('/expenses?filter={"client_id@eq":"client-1"}');
    expect(
      screen.getByRole("link", { name: /Fatture/ }).getAttribute("href"),
    ).toBe(
      '/financial_documents_summary?filter={"client_id@eq":"client-1","direction@eq":"outbound"}',
    );
  });

  it("keeps operational links scoped when the draft builder returns null", () => {
    render(
      <MemoryRouter>
        <InvoiceDraftDialog
          open
          onOpenChange={vi.fn()}
          draft={null}
          emptyStateContext={{ clientId: "client-1" }}
        />
      </MemoryRouter>,
    );

    expect(
      screen
        .getByRole("link", { name: /Registro lavori/ })
        .getAttribute("href"),
    ).toBe('/services?filter={"client_id@eq":"client-1"}');
    expect(
      screen.getByRole("link", { name: /Spese/ }).getAttribute("href"),
    ).toBe('/expenses?filter={"client_id@eq":"client-1"}');
    expect(
      screen.getByRole("link", { name: /Fatture/ }).getAttribute("href"),
    ).toBe(
      '/financial_documents_summary?filter={"client_id@eq":"client-1","direction@eq":"outbound"}',
    );
  });

  it("uses the project filter for operational records when project context is available", () => {
    render(
      <MemoryRouter>
        <InvoiceDraftDialog
          open
          onOpenChange={vi.fn()}
          draft={null}
          emptyStateContext={{ clientId: "client-1", projectId: "project-1" }}
        />
      </MemoryRouter>,
    );

    expect(
      screen
        .getByRole("link", { name: /Registro lavori/ })
        .getAttribute("href"),
    ).toBe('/services?filter={"project_id@eq":"project-1"}');
    expect(
      screen.getByRole("link", { name: /Spese/ }).getAttribute("href"),
    ).toBe('/expenses?filter={"project_id@eq":"project-1"}');
    expect(
      screen.getByRole("link", { name: /Fatture/ }).getAttribute("href"),
    ).toBe(
      '/financial_documents_summary?filter={"client_id@eq":"client-1","direction@eq":"outbound"}',
    );
  });
});
