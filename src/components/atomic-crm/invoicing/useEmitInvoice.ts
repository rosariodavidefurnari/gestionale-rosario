import { useState } from "react";
import { useDataProvider } from "ra-core";

import type { CrmDataProvider } from "../providers/types";
import type { EmitInvoiceResult } from "../providers/supabase/dataProviderInvoiceEmit";
import {
  computeInvoiceDraftAmounts,
  type InvoiceDraftInput,
} from "./invoiceDraftTypes";

/** Confirm prompt shown when an outbound document with the same number already
 * exists for the client (WF-14 dedup guard, in addition to the server UNIQUE). */
export const buildEmitConfirmMessage = (documentNumber: string): string =>
  `Esiste gia' un documento con numero "${documentNumber}" per questo cliente. ` +
  "Emettere comunque?";

export type InvoiceEmitGate = {
  isEmittableSource: boolean;
  canEmit: boolean;
  blockedReason: string | null;
};

/**
 * Pure decision for the "Emetti fattura" button gate (spec v2 F6/F11/F12):
 * only project/client sources, no prior acconto in v1, complete FatturaPA
 * billing fields and a document number. `blockedReason` is shown only when the
 * source is emittable but the action is blocked.
 */
export const getInvoiceEmitGate = ({
  sourceKind,
  hasPriorReceived,
  billing,
  documentNumber,
}: {
  sourceKind: string;
  hasPriorReceived: boolean;
  billing: { ok: boolean; missing: string[] };
  documentNumber: string;
}): InvoiceEmitGate => {
  const isEmittableSource = sourceKind === "project" || sourceKind === "client";
  const trimmed = documentNumber.trim();
  const canEmit =
    isEmittableSource && !hasPriorReceived && trimmed.length > 0 && billing.ok;

  let blockedReason: string | null = null;
  if (isEmittableSource && !canEmit) {
    if (hasPriorReceived) {
      blockedReason =
        "Fattura con acconto pregresso: per ora emissione manuale.";
    } else if (!billing.ok) {
      blockedReason = `Dati fattura incompleti: ${billing.missing.join(", ")}.`;
    } else if (trimmed.length === 0) {
      blockedReason = "Inserisci il numero fattura.";
    }
  }

  return { isEmittableSource, canEmit, blockedReason };
};

export type EmitInvoiceOutcome =
  | { status: "cancelled" }
  | { status: "emitted" | "already_emitted"; result: EmitInvoiceResult };

export const useEmitInvoice = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const [isEmitting, setIsEmitting] = useState(false);

  const emit = async (
    draft: InvoiceDraftInput,
    {
      documentNumber,
      issueDate,
    }: { documentNumber: string; issueDate: string },
  ): Promise<EmitInvoiceOutcome> => {
    setIsEmitting(true);
    try {
      const clientId = String(draft.client.id);

      const existing = await dataProvider.getList(
        "financial_documents_summary",
        {
          pagination: { page: 1, perPage: 1 },
          sort: { field: "issue_date", order: "DESC" },
          filter: {
            "client_id@eq": clientId,
            "document_number@eq": documentNumber,
          },
        },
      );
      if (
        existing.total &&
        existing.total > 0 &&
        !window.confirm(buildEmitConfirmMessage(documentNumber))
      ) {
        return { status: "cancelled" };
      }

      const amounts = computeInvoiceDraftAmounts(draft.lineItems);
      const result = await dataProvider.emitInvoice({
        clientId,
        source: {
          kind: draft.source.kind as "project" | "client",
          id: String(draft.source.id),
        },
        documentNumber,
        issueDate,
        grossTaxable: amounts.grossTaxable,
        stampAmount: amounts.stampDuty,
        grossTotal: amounts.grossTotal,
        netCollectable: amounts.netCollectable,
        serviceIds: (draft.serviceIds ?? []).map(String),
        expenseIds: (draft.expenseIds ?? []).map(String),
      });

      return { status: result.status, result };
    } finally {
      setIsEmitting(false);
    }
  };

  return { emit, isEmitting };
};
