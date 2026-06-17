import { useState } from "react";
import { useDataProvider } from "ra-core";

import type { CrmDataProvider } from "../providers/types";
import type { VoidInvoiceResult } from "../providers/supabase/dataProviderInvoiceEmit";

export type VoidInvoiceOutcome =
  | { status: "cancelled" }
  | { status: "voided" | "already_voided"; result: VoidInvoiceResult };

/** Minimal provider surface (injectable for tests). */
export type VoidInvoiceDeps = Pick<CrmDataProvider, "voidEmittedInvoice">;

/**
 * Pure async orchestration (no React, no window) so it is unit-testable: ask for
 * confirmation, then call the void EF. The `confirm` thunk is injected (the UI
 * passes `window.confirm`).
 */
export const runVoidInvoice = async (
  dataProvider: VoidInvoiceDeps,
  documentId: string,
  { confirm }: { confirm: () => boolean },
): Promise<VoidInvoiceOutcome> => {
  if (!confirm()) {
    return { status: "cancelled" };
  }
  const result = await dataProvider.voidEmittedInvoice(documentId);
  return { status: result.status, result };
};

export const useVoidInvoice = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const [isVoiding, setIsVoiding] = useState(false);

  const voidInvoice = async (
    documentId: string,
    opts: { confirm: () => boolean },
  ): Promise<VoidInvoiceOutcome> => {
    setIsVoiding(true);
    try {
      return await runVoidInvoice(dataProvider, documentId, opts);
    } finally {
      setIsVoiding(false);
    }
  };

  return { voidInvoice, isVoiding };
};
