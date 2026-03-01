import { Database, FolderKanban, ReceiptText, Users2, Wallet } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { UnifiedCrmReadContext } from "@/lib/ai/unifiedCrmReadContext";

const formatCurrency = (value: number) =>
  value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Data non disponibile";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleDateString("it-IT", {
    dateStyle: "short",
  });
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle: string;
}) => (
  <div className="rounded-2xl border bg-background/90 p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="rounded-full bg-primary/10 p-2 text-primary">
        <Icon className="size-4" />
      </div>
    </div>
  </div>
);

const SnapshotList = ({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: ReactNode[];
}) => (
  <div className="rounded-2xl border bg-background/90 p-4 shadow-sm">
    <p className="text-sm font-medium">{title}</p>
    {items.length === 0 ? (
      <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
    ) : (
      <div className="mt-3 space-y-3">{items}</div>
    )}
  </div>
);

export const UnifiedCrmReadSnapshot = ({
  context,
}: {
  context: UnifiedCrmReadContext;
}) => {
  const { snapshot } = context;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-muted/20 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Snapshot CRM</Badge>
          <Badge variant="outline">Read-only</Badge>
          <Badge variant="outline">{context.meta.generatedAtLabel}</Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Il launcher legge gia clienti, preventivi, progetti, pagamenti e spese
          in un contesto unico coerente con i registry del CRM.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={Users2}
          label="Clienti"
          value={String(snapshot.counts.clients)}
          subtitle={`${snapshot.recentClients.length} recenti nel contesto`}
        />
        <StatCard
          icon={ReceiptText}
          label="Preventivi aperti"
          value={String(snapshot.counts.openQuotes)}
          subtitle={formatCurrency(snapshot.totals.openQuotesAmount)}
        />
        <StatCard
          icon={FolderKanban}
          label="Progetti attivi"
          value={String(snapshot.counts.activeProjects)}
          subtitle="Solo stati non chiusi"
        />
        <StatCard
          icon={Wallet}
          label="Pagamenti in attesa"
          value={String(snapshot.counts.pendingPayments)}
          subtitle={formatCurrency(snapshot.totals.pendingPaymentsAmount)}
        />
        <StatCard
          icon={Database}
          label="Spese registrate"
          value={String(snapshot.counts.expenses)}
          subtitle={formatCurrency(snapshot.totals.expensesAmount)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SnapshotList
          title="Clienti recenti"
          emptyLabel="Nessun cliente recente nel contesto corrente."
          items={snapshot.recentClients.map((client) => (
            <div
              key={client.clientId}
              className="rounded-xl border bg-muted/10 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{client.clientName}</p>
                <Badge variant="outline">Cliente</Badge>
              </div>
              {client.billingName &&
              client.billingName !== client.operationalName ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Fatturazione: {client.billingName}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">
                {[
                  client.vatNumber ? `P.IVA ${client.vatNumber}` : null,
                  client.fiscalCode ? `CF ${client.fiscalCode}` : null,
                  client.billingCity ? client.billingCity : null,
                  client.billingSdiCode
                    ? `Codice dest. ${client.billingSdiCode}`
                    : null,
                  client.billingPec ? `PEC ${client.billingPec}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Profilo fiscale non completo"}
              </p>
              {client.billingAddress ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {client.billingAddress}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Creato il {formatDate(client.createdAt)}
                {client.email ? ` · ${client.email}` : ""}
              </p>
            </div>
          ))}
        />

        <SnapshotList
          title="Preventivi aperti"
          emptyLabel="Nessun preventivo aperto nel contesto corrente."
          items={snapshot.openQuotes.map((quote) => (
            <div
              key={quote.quoteId}
              className="rounded-xl border bg-muted/10 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{quote.clientName}</p>
                <Badge variant="outline">{quote.statusLabel}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {quote.projectName ?? "Nessun progetto"} · {formatCurrency(quote.amount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Creato il {formatDate(quote.createdAt)}
              </p>
            </div>
          ))}
        />

        <SnapshotList
          title="Pagamenti da seguire"
          emptyLabel="Nessun pagamento in attesa nel contesto corrente."
          items={snapshot.pendingPayments.map((payment) => (
            <div
              key={payment.paymentId}
              className="rounded-xl border bg-muted/10 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {payment.clientName ?? "Cliente non associato"}
                </p>
                <Badge variant="outline">{payment.statusLabel}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {payment.projectName ?? "Nessun progetto"} ·{" "}
                {formatCurrency(payment.amount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Scadenza/pagamento: {formatDate(payment.paymentDate)}
              </p>
            </div>
          ))}
        />

        <SnapshotList
          title="Progetti attivi"
          emptyLabel="Nessun progetto attivo nel contesto corrente."
          items={snapshot.activeProjects.map((project) => (
            <div
              key={project.projectId}
              className="rounded-xl border bg-muted/10 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{project.projectName}</p>
                <Badge variant="outline">{project.statusLabel}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.clientName ?? "Cliente non associato"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Inizio: {formatDate(project.startDate)}
              </p>
            </div>
          ))}
        />

        <SnapshotList
          title="Spese recenti"
          emptyLabel="Nessuna spesa recente nel contesto corrente."
          items={snapshot.recentExpenses.map((expense) => (
            <div
              key={expense.expenseId}
              className="rounded-xl border bg-muted/10 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {expense.description ?? expense.expenseTypeLabel}
                </p>
                <Badge variant="outline">{expense.expenseTypeLabel}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {expense.projectName ?? expense.clientName ?? "Nessun link"} ·{" "}
                {formatCurrency(expense.amount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Data spesa: {formatDate(expense.expenseDate)}
              </p>
            </div>
          ))}
        />
      </div>
    </div>
  );
};
