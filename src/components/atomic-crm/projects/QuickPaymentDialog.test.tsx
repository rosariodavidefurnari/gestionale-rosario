// @vitest-environment jsdom

import "@/setupTests";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as RaCore from "ra-core";
import { todayISODate } from "@/lib/dateTimezone";
import type { Payment, Project } from "../types";

const createMock = vi.fn();
const updateMock = vi.fn();
const notify = vi.fn();
const refresh = vi.fn();

// Candidate expected payments returned for the FIX-3 query (the one carrying the
// `financial_document_id@not.is` filter key). Mutated per test.
let candidates: Partial<Payment>[] = [];

vi.mock("react-router", () => ({
  useLocation: () => ({ search: "" }),
}));

vi.mock("ra-core", async () => {
  const actual = await vi.importActual<typeof RaCore>("ra-core");
  return {
    ...actual,
    useGetOne: () => ({
      data: { id: "prj-1", total_fees: 1000, total_expenses: 0, total_paid: 0 },
    }),
    useGetList: (
      _resource: string,
      params: { filter?: Record<string, unknown> },
    ) => {
      const isCandidateQuery =
        params?.filter != null &&
        Object.prototype.hasOwnProperty.call(
          params.filter,
          "financial_document_id@not.is",
        );
      return { data: isCandidateQuery ? candidates : [] };
    },
    useCreate: () => [createMock],
    useUpdate: () => [updateMock],
    useNotify: () => notify,
    useRefresh: () => refresh,
  };
});

import { QuickPaymentDialog } from "./QuickPaymentDialog";

const record = {
  id: "prj-1",
  name: "Progetto Test",
  client_id: "client-1",
} as unknown as Project;

const renderDialog = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <QuickPaymentDialog record={record} />
    </QueryClientProvider>,
  );
};

const openAndSubmit = async () => {
  fireEvent.click(screen.getByRole("button", { name: /Pagamento/ }));
  const submit = await screen.findByRole("button", { name: /Registra/ });
  fireEvent.click(submit);
};

describe("QuickPaymentDialog (FIX-3 reconciliation)", () => {
  beforeEach(() => {
    // WF-9: freeze ONLY Date (not setTimeout, so RTL waitFor still works) to lock
    // the cassa year deterministically.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-19T10:00:00Z"));
    createMock.mockReset().mockResolvedValue({});
    updateMock.mockReset().mockResolvedValue({});
    notify.mockReset();
    refresh.mockReset();
    candidates = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("SETTLES the emit-linked expected payment (update, not create)", async () => {
    candidates = [
      {
        id: "pay-1",
        amount: 1000,
        status: "in_attesa",
        financial_document_id: "doc-1",
        // a FUTURE due-date on the expected row: the settle must NOT use it as
        // the cash date (that is the I1 hazard — money in the wrong fiscal year).
        payment_date: "2027-01-31",
      },
    ];
    renderDialog();
    await openAndSubmit();

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(createMock).not.toHaveBeenCalled();
    const [, params] = updateMock.mock.calls[0];
    expect(params.id).toBe("pay-1");
    expect(params.data.status).toBe("ricevuto");
    // VP2/I1/WF-9: a settled (ricevuto) payment lands the cash on TODAY (business
    // tz), never null and never the future due-date. Frozen clock locks the year.
    expect(params.data.payment_date).toBe(todayISODate());
    expect(params.data.payment_date).not.toBe("2027-01-31");
  });

  it("CREATES when there is no emit-linked expected payment", async () => {
    candidates = [];
    renderDialog();
    await openAndSubmit();

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("asks WHICH invoice on >1 linked candidate (ambiguous, no write)", async () => {
    candidates = [
      {
        id: "pay-1",
        amount: 1000,
        status: "in_attesa",
        financial_document_id: "doc-1",
        invoice_ref: "FT-1/2026",
      },
      {
        id: "pay-2",
        amount: 1000,
        status: "in_attesa",
        financial_document_id: "doc-2",
        invoice_ref: "FT-2/2026",
      },
    ];
    renderDialog();
    await openAndSubmit();

    // picker shown, nothing written yet
    expect(
      await screen.findByText(/Quale stai incassando/),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();

    // pick the second invoice -> settle that exact row
    fireEvent.click(screen.getByRole("button", { name: /FT-2\/2026/ }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock.mock.calls[0][1].id).toBe("pay-2");
    expect(createMock).not.toHaveBeenCalled();
  });
});
