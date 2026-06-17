import { extractEdgeFunctionErrorMessage } from "./edgeFunctionError";
import type { InvokeEdgeFunction } from "./dataProviderTypes";

export type EmitInvoiceRequest = {
  clientId: string;
  source: { kind: "project" | "client"; id: string };
  documentNumber: string;
  issueDate: string;
  dueDate?: string | null;
  grossTaxable: number;
  stampAmount: number;
  grossTotal: number;
  netCollectable: number;
  serviceIds: string[];
  expenseIds: string[];
};

export type EmitInvoiceResult =
  | {
      status: "emitted";
      financialDocumentId: string;
      paymentId: string;
      servicesMarked: number;
      expensesMarked: number;
    }
  | { status: "already_emitted"; financialDocumentId: string };

export type VoidInvoiceResult =
  | {
      status: "voided";
      servicesUnmarked: number;
      expensesUnmarked: number;
      paymentsDeleted: number;
    }
  | { status: "already_voided" };

export const buildInvoiceEmitProviderMethods = (deps: {
  invokeEdgeFunction: InvokeEdgeFunction;
}) => ({
  async emitInvoice(request: EmitInvoiceRequest): Promise<EmitInvoiceResult> {
    const { data, error } = await deps.invokeEdgeFunction<{
      data: EmitInvoiceResult;
    }>("invoice_emit", {
      method: "POST",
      body: request,
    });

    if (!data || error) {
      console.error("emitInvoice.error", error);
      throw new Error(
        await extractEdgeFunctionErrorMessage(
          error,
          "Impossibile emettere la fattura.",
        ),
      );
    }

    return data.data;
  },

  async voidEmittedInvoice(documentId: string): Promise<VoidInvoiceResult> {
    const { data, error } = await deps.invokeEdgeFunction<{
      data: VoidInvoiceResult;
    }>("invoice_void", {
      method: "POST",
      body: { documentId },
    });

    if (!data || error) {
      console.error("voidEmittedInvoice.error", error);
      throw new Error(
        await extractEdgeFunctionErrorMessage(
          error,
          "Impossibile annullare la fattura.",
        ),
      );
    }

    return data.data;
  },
});
