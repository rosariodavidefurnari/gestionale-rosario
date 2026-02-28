import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getInvoiceImportRecordValidationErrors,
  type InvoiceImportDraft,
  type InvoiceImportRecordDraft,
  type InvoiceImportWorkspace,
} from "@/lib/ai/invoiceImport";
import {
  expenseTypeChoices,
  expenseTypeLabels,
} from "../expenses/expenseTypes";
import {
  paymentMethodChoices,
  paymentStatusChoices,
  paymentTypeChoices,
} from "../payments/paymentTypes";

const confidenceTone: Record<
  InvoiceImportRecordDraft["confidence"],
  "default" | "secondary" | "outline"
> = {
  high: "default",
  medium: "secondary",
  low: "outline",
};

const resourceLabels = {
  payments: "Pagamento",
  expenses: "Spesa",
};

const Field = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("space-y-2", className)}>
    <Label>{label}</Label>
    {children}
  </div>
);

const SelectField = ({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
  >
    {children}
  </select>
);

export const InvoiceImportDraftEditor = ({
  draft,
  workspace,
  onChange,
  onRemove,
}: {
  draft: InvoiceImportDraft;
  workspace: InvoiceImportWorkspace;
  onChange: (index: number, patch: Partial<InvoiceImportRecordDraft>) => void;
  onRemove: (index: number) => void;
}) => {
  return (
    <div className="space-y-4">
      {draft.records.map((record, index) => {
        const missingFields = getInvoiceImportRecordValidationErrors(
          record,
          workspace,
        );

        return (
          <div
            key={record.id}
            className="rounded-2xl border bg-background/90 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {resourceLabels[record.resource]}
                  </Badge>
                  <Badge variant={confidenceTone[record.confidence]}>
                    Confidenza {record.confidence}
                  </Badge>
                  <Badge variant="outline">{record.documentType}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {record.sourceFileNames.join(", ") || "File non indicato"}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                aria-label={`Escludi record ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {record.rationale ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {record.rationale}
              </p>
            ) : null}

            {missingFields.length > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Prima di confermare manca: {missingFields.join(", ")}.
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Tipo record">
                <SelectField
                  value={record.resource}
                  onChange={(value) =>
                    onChange(index, {
                      resource: value as "payments" | "expenses",
                    })
                  }
                >
                  <option value="payments">Pagamento</option>
                  <option value="expenses">Spesa</option>
                </SelectField>
              </Field>

              <Field label="Controparte letta dal documento">
                <Input
                  value={record.counterpartyName ?? ""}
                  onChange={(event) =>
                    onChange(index, { counterpartyName: event.target.value })
                  }
                />
              </Field>

              <Field label="Rif. fattura">
                <Input
                  value={record.invoiceRef ?? ""}
                  onChange={(event) =>
                    onChange(index, { invoiceRef: event.target.value })
                  }
                />
              </Field>

              <Field label="Importo (EUR)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={record.amount ?? ""}
                  onChange={(event) =>
                    onChange(index, {
                      amount:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </Field>

              <Field label="Data documento">
                <Input
                  type="date"
                  value={record.documentDate ?? ""}
                  onChange={(event) =>
                    onChange(index, { documentDate: event.target.value })
                  }
                />
              </Field>

              <Field label="Scadenza">
                <Input
                  type="date"
                  value={record.dueDate ?? ""}
                  onChange={(event) =>
                    onChange(index, { dueDate: event.target.value })
                  }
                />
              </Field>

              <Field label="Cliente CRM">
                <SelectField
                  value={String(record.clientId ?? "")}
                  onChange={(value) => {
                    const nextClientId = value || null;
                    const hasMatchingProject =
                      !record.projectId ||
                      workspace.projects.some(
                        (project) =>
                          project.id === record.projectId &&
                          String(project.client_id) === String(nextClientId),
                      );

                    onChange(index, {
                      clientId: nextClientId,
                      projectId: hasMatchingProject ? record.projectId ?? null : null,
                    });
                  }}
                >
                  <option value="">Seleziona cliente</option>
                  {workspace.clients.map((client) => (
                    <option key={client.id} value={String(client.id)}>
                      {client.name}
                      {client.email ? ` · ${client.email}` : ""}
                    </option>
                  ))}
                </SelectField>
              </Field>

              <Field label="Progetto CRM">
                <SelectField
                  value={String(record.projectId ?? "")}
                  onChange={(value) => {
                    const nextProject =
                      workspace.projects.find(
                        (project) => String(project.id) === value,
                      ) ?? null;

                    onChange(index, {
                      projectId: nextProject?.id ?? null,
                      clientId: nextProject?.client_id ?? record.clientId ?? null,
                    });
                  }}
                >
                  <option value="">Nessun progetto</option>
                  {workspace.projects
                    .filter(
                      (project) =>
                        !record.clientId ||
                        String(project.client_id) === String(record.clientId),
                    )
                    .map((project) => (
                      <option key={project.id} value={String(project.id)}>
                        {project.name}
                      </option>
                    ))}
                </SelectField>
              </Field>

              {record.resource === "payments" ? (
                <>
                  <Field label="Tipo pagamento">
                    <SelectField
                      value={record.paymentType ?? "saldo"}
                      onChange={(value) =>
                        onChange(index, {
                          paymentType:
                            value as InvoiceImportRecordDraft["paymentType"],
                        })
                      }
                    >
                      {paymentTypeChoices.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.name}
                        </option>
                      ))}
                    </SelectField>
                  </Field>

                  <Field label="Metodo pagamento">
                    <SelectField
                      value={record.paymentMethod ?? "bonifico"}
                      onChange={(value) =>
                        onChange(index, {
                          paymentMethod:
                            value as InvoiceImportRecordDraft["paymentMethod"],
                        })
                      }
                    >
                      {paymentMethodChoices.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.name}
                        </option>
                      ))}
                    </SelectField>
                  </Field>

                  <Field label="Stato pagamento">
                    <SelectField
                      value={record.paymentStatus ?? "in_attesa"}
                      onChange={(value) =>
                        onChange(index, {
                          paymentStatus:
                            value as InvoiceImportRecordDraft["paymentStatus"],
                        })
                      }
                    >
                      {paymentStatusChoices.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.name}
                        </option>
                      ))}
                    </SelectField>
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Tipo spesa">
                    <SelectField
                      value={record.expenseType ?? "acquisto_materiale"}
                      onChange={(value) =>
                        onChange(index, {
                          expenseType:
                            value as InvoiceImportRecordDraft["expenseType"],
                        })
                      }
                    >
                      {expenseTypeChoices.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.name}
                        </option>
                      ))}
                    </SelectField>
                  </Field>

                  <Field label="Descrizione spesa" className="md:col-span-2">
                    <Input
                      value={
                        record.description ??
                        expenseTypeLabels[record.expenseType ?? "acquisto_materiale"] ??
                        ""
                      }
                      onChange={(event) =>
                        onChange(index, { description: event.target.value })
                      }
                    />
                  </Field>
                </>
              )}

              <Field label="Note import" className="md:col-span-2">
                <Textarea
                  value={record.notes ?? ""}
                  onChange={(event) =>
                    onChange(index, { notes: event.target.value })
                  }
                  className="min-h-24"
                />
              </Field>
            </div>
          </div>
        );
      })}
    </div>
  );
};
