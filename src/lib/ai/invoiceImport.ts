import type { Identifier } from "ra-core";

import type {
  Client,
  Expense,
  Payment,
  Project,
} from "@/components/atomic-crm/types";

export type InvoiceImportFileHandle = {
  path: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
};

export type InvoiceImportWorkspace = {
  clients: Array<Pick<Client, "id" | "name" | "email">>;
  projects: Array<Pick<Project, "id" | "name" | "client_id">>;
};

export type InvoiceImportRecordDraft = {
  id: string;
  sourceFileNames: string[];
  resource: "payments" | "expenses";
  confidence: "high" | "medium" | "low";
  documentType: "customer_invoice" | "supplier_invoice" | "receipt" | "unknown";
  rationale?: string | null;
  counterpartyName?: string | null;
  invoiceRef?: string | null;
  amount: number | null;
  currency?: string | null;
  documentDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  clientId?: Identifier | null;
  projectId?: Identifier | null;
  paymentType?: Payment["payment_type"] | null;
  paymentMethod?: Payment["method"] | null;
  paymentStatus?: Payment["status"] | null;
  expenseType?: Expense["expense_type"] | null;
  description?: string | null;
};

export type InvoiceImportDraft = {
  model: string;
  generatedAt: string;
  summary: string;
  warnings: string[];
  records: InvoiceImportRecordDraft[];
};

export type GenerateInvoiceImportDraftRequest = {
  files: InvoiceImportFileHandle[];
  model: string;
  userInstructions?: string | null;
};

export type InvoiceImportConfirmation = {
  created: Array<{
    resource: "payments" | "expenses";
    id: Identifier;
    invoiceRef?: string | null;
    amount?: number | null;
  }>;
};

const defaultPaymentDraft: Pick<
  InvoiceImportRecordDraft,
  "paymentType" | "paymentMethod" | "paymentStatus"
> = {
  paymentType: "saldo",
  paymentMethod: "bonifico",
  paymentStatus: "in_attesa",
};

const defaultExpenseDraft: Pick<InvoiceImportRecordDraft, "expenseType"> = {
  expenseType: "acquisto_materiale",
};

export const normalizeInvoiceImportRecord = (
  record: InvoiceImportRecordDraft,
): InvoiceImportRecordDraft => {
  const normalizedAmount =
    record.amount == null || Number.isNaN(Number(record.amount))
      ? null
      : Number(record.amount);

  return {
    ...defaultPaymentDraft,
    ...defaultExpenseDraft,
    ...record,
    sourceFileNames: record.sourceFileNames ?? [],
    confidence: record.confidence ?? "medium",
    documentType: record.documentType ?? "unknown",
    amount: normalizedAmount,
  };
};

export const normalizeInvoiceImportDraft = (
  draft: InvoiceImportDraft,
): InvoiceImportDraft => ({
  ...draft,
  warnings: draft.warnings ?? [],
  records: (draft.records ?? []).map(normalizeInvoiceImportRecord),
});

export const getInvoiceImportRecordValidationErrors = (
  record: InvoiceImportRecordDraft,
  workspace?: InvoiceImportWorkspace,
) => {
  const normalized = normalizeInvoiceImportRecord(record);
  const errors: string[] = [];

  if (normalized.amount == null || normalized.amount <= 0) {
    errors.push("importo valido");
  }

  if (!normalized.documentDate) {
    errors.push("data documento");
  }

  if (normalized.resource === "payments") {
    if (!normalized.clientId) {
      errors.push("cliente");
    }
    if (!normalized.paymentType) {
      errors.push("tipo pagamento");
    }
    if (!normalized.paymentStatus) {
      errors.push("stato pagamento");
    }
  }

  if (normalized.resource === "expenses" && !normalized.expenseType) {
    errors.push("tipo spesa");
  }

  if (workspace && normalized.projectId) {
    const matchedProject = workspace.projects.find(
      (project) => project.id === normalized.projectId,
    );

    if (!matchedProject) {
      errors.push("progetto valido");
    } else if (
      normalized.clientId &&
      matchedProject.client_id !== normalized.clientId
    ) {
      errors.push("cliente/progetto coerenti");
    }
  }

  return errors;
};

export const buildInvoiceImportRecordNotes = (
  record: InvoiceImportRecordDraft,
) =>
  [
    record.notes?.trim(),
    record.dueDate ? `Scadenza documento: ${record.dueDate}` : null,
    "Importato dalla chat AI fatture",
  ]
    .filter(Boolean)
    .join("\n");

export const getClientLabel = (
  workspace: InvoiceImportWorkspace,
  clientId?: Identifier | null,
) =>
  workspace.clients.find((client) => client.id === clientId)?.name ??
  "Cliente non selezionato";

export const getProjectLabel = (
  workspace: InvoiceImportWorkspace,
  projectId?: Identifier | null,
) =>
  workspace.projects.find((project) => project.id === projectId)?.name ??
  "Nessun progetto";
