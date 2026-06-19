// @vitest-environment jsdom

import "@/setupTests";
import { useMemo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as RaCore from "ra-core";

// Candidate emit-linked expected payments returned for the FIX-3-gemello query
// (the one carrying the `financial_document_id@not.is` filter key). Mutated per test.
let candidates: Array<Record<string, unknown>> = [];
// Create vs edit: undefined = create (card may warn), object = edit (always hidden).
let recordCtx: unknown = undefined;

vi.mock("ra-core", async () => {
  const actual = await vi.importActual<typeof RaCore>("ra-core");
  return {
    ...actual,
    useRecordContext: () => recordCtx,
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
  };
});

import { ExpectedPaymentOrphanHint } from "./PaymentInputs";

const setValueSpy = vi.fn();

const Harness = ({
  defaultValues,
  children,
}: {
  defaultValues: Record<string, unknown>;
  children: ReactNode;
}) => {
  const methods = useForm({ defaultValues });
  // Patch setValue with a spy so the test can assert the card never writes the
  // form (display-only). control stays real → useWatch keeps working.
  const patched = useMemo(
    () => ({ ...methods, setValue: setValueSpy }),
    [methods],
  );
  return <FormProvider {...patched}>{children}</FormProvider>;
};

const renderHint = (defaultValues: Record<string, unknown>) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Harness defaultValues={defaultValues}>
          <ExpectedPaymentOrphanHint />
        </Harness>
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

const linkedCandidate = {
  id: "pay-1",
  amount: 1000,
  status: "in_attesa",
  financial_document_id: "doc-1",
};

const collectionDraft = {
  project_id: "prj-1",
  status: "ricevuto",
  payment_type: "saldo",
};

describe("ExpectedPaymentOrphanHint", () => {
  beforeEach(() => {
    candidates = [];
    recordCtx = undefined;
    setValueSpy.mockReset();
  });

  it("warns ON LOAD when create + ricevuto + absorbable + emit-linked candidate (AI-handoff path)", async () => {
    candidates = [linkedCandidate];
    renderHint(collectionDraft);

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(within(alert).getByText(/incasso atteso/i)).toBeInTheDocument();
    // big at-risk amount rendered (optional grouping dot: jsdom ICU may render
    // "1000,00" while a full-ICU browser renders "1.000,00")
    expect(within(alert).getByText(/1\.?000,00/)).toBeInTheDocument();
    // steer link → project show (plain path, no launcher params / AI banner)
    const link = within(alert).getByRole("link", {
      name: /vai al progetto e salda/i,
    });
    expect(link).toHaveAttribute("href", "/projects/prj-1/show");
    // display-only: never writes the form
    expect(setValueSpy).not.toHaveBeenCalled();
  });

  it("is HIDDEN in edit mode (F1: PaymentInputs shared with PaymentEdit)", () => {
    candidates = [linkedCandidate];
    recordCtx = { id: "pay-1" };
    renderHint(collectionDraft);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("is hidden when status is not a collection (in_attesa)", () => {
    candidates = [linkedCandidate];
    renderHint({ ...collectionDraft, status: "in_attesa" });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("is hidden for a non-absorbable type (rimborso_spese)", () => {
    candidates = [linkedCandidate];
    renderHint({ ...collectionDraft, payment_type: "rimborso_spese" });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("is hidden when there is no emit-linked candidate", () => {
    candidates = [];
    renderHint(collectionDraft);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("is hidden when there is no project", () => {
    candidates = [linkedCandidate];
    renderHint({ ...collectionDraft, project_id: undefined });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
