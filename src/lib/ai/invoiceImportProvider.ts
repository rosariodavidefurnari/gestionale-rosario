import type { Identifier } from "ra-core";

import type {
  Contact,
  Expense,
  Payment,
  Project,
} from "@/components/atomic-crm/types";

import {
  buildInvoiceImportRecordNotes,
  getInvoiceImportPaymentDate,
  getInvoiceImportRecordValidationErrors,
  normalizeInvoiceImportDraft,
  type InvoiceImportConfirmation,
  type InvoiceImportDraft,
  type InvoiceImportWorkspaceClient,
  type InvoiceImportWorkspace,
} from "./invoiceImport";

type CreateResource = "payments" | "expenses";

type CreateFn = <T>(
  resource: CreateResource,
  params: { data: Partial<Payment> | Partial<Expense> },
) => Promise<{ data: T }>;

export const buildInvoiceImportWorkspace = ({
  clients,
  contacts,
  projects,
}: {
  clients: InvoiceImportWorkspaceClient[];
  contacts: Array<Pick<Contact, "id" | "client_id" | "first_name" | "last_name">>;
  projects: Array<Pick<Project, "id" | "name" | "client_id">>;
}): InvoiceImportWorkspace => ({
  clients,
  contacts,
  projects,
});

export const confirmInvoiceImportDraftWithCreate = async ({
  draft,
  create,
}: {
  draft: InvoiceImportDraft;
  create: CreateFn;
}): Promise<InvoiceImportConfirmation> => {
  const normalizedDraft = normalizeInvoiceImportDraft(draft);
  const created: InvoiceImportConfirmation["created"] = [];

  for (const record of normalizedDraft.records) {
    const missingFields = getInvoiceImportRecordValidationErrors(record);
    if (missingFields.length > 0) {
      throw new Error(
        `Il record ${record.invoiceRef ?? record.id} non e' confermabile: manca ${missingFields.join(", ")}.`,
      );
    }

    if (record.resource === "payments") {
      const response = await create<Payment>("payments", {
        data: {
          client_id: record.clientId as Identifier,
          project_id: record.projectId ?? null,
          payment_date: getInvoiceImportPaymentDate(record),
          payment_type: record.paymentType ?? "saldo",
          amount: Number(record.amount),
          method: record.paymentMethod ?? null,
          invoice_ref: record.invoiceRef ?? null,
          status: record.paymentStatus ?? "in_attesa",
          notes: buildInvoiceImportRecordNotes(record) || undefined,
        },
      });

      created.push({
        resource: "payments",
        id: response.data.id,
        invoiceRef: record.invoiceRef ?? null,
        amount: record.amount,
      });
      continue;
    }

    const response = await create<Expense>("expenses", {
      data: {
        client_id: record.clientId ?? null,
        project_id: record.projectId ?? null,
        expense_date: record.documentDate,
        expense_type: record.expenseType ?? "acquisto_materiale",
        amount: Number(record.amount),
        invoice_ref: record.invoiceRef ?? null,
        description:
          record.description?.trim() ||
          record.counterpartyName?.trim() ||
          buildInvoiceImportRecordNotes(record) ||
          undefined,
      },
    });

    created.push({
      resource: "expenses",
      id: response.data.id,
      invoiceRef: record.invoiceRef ?? null,
      amount: record.amount,
    });
  }

  return { created };
};
