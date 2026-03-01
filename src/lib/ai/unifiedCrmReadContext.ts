import { expenseTypeLabels } from "@/components/atomic-crm/expenses/expenseTypes";
import { paymentStatusLabels } from "@/components/atomic-crm/payments/paymentTypes";
import { projectStatusLabels } from "@/components/atomic-crm/projects/projectTypes";
import { buildQuotePaymentsSummary } from "@/components/atomic-crm/quotes/quotePaymentsSummary";
import { quoteStatusLabels } from "@/components/atomic-crm/quotes/quotesTypes";
import type {
  Client,
  Expense,
  Payment,
  Project,
  Quote,
} from "@/components/atomic-crm/types";
import type { CrmCapabilityRegistry } from "@/lib/semantics/crmCapabilityRegistry";
import type { CrmSemanticRegistry } from "@/lib/semantics/crmSemanticRegistry";

const openQuoteClosedStatuses = new Set([
  "saldato",
  "rifiutato",
  "perso",
  "completato",
]);
const inactiveProjectStatuses = new Set(["completato", "cancellato"]);

const toDateValue = (value?: string | null) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? Number.NEGATIVE_INFINITY : date.valueOf();
};

const formatDateTimeLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const getClientName = (
  clientById: Map<string, Pick<Client, "id" | "name">>,
  clientId?: Client["id"] | null,
) => (clientId ? clientById.get(String(clientId))?.name ?? "Cliente non trovato" : null);

const getProjectName = (
  projectById: Map<string, Pick<Project, "id" | "name">>,
  projectId?: Project["id"] | null,
) =>
  projectId ? projectById.get(String(projectId))?.name ?? "Progetto non trovato" : null;

export type UnifiedCrmReadContext = {
  meta: {
    generatedAt: string;
    generatedAtLabel: string;
    businessTimezone: string;
    routePrefix: string;
    scope: "crm_read_snapshot";
  };
  registries: {
    semantic: CrmSemanticRegistry;
    capability: CrmCapabilityRegistry;
  };
  snapshot: {
    counts: {
      clients: number;
      quotes: number;
      openQuotes: number;
      activeProjects: number;
      pendingPayments: number;
      expenses: number;
    };
    totals: {
      openQuotesAmount: number;
      pendingPaymentsAmount: number;
      expensesAmount: number;
    };
    recentClients: Array<{
      clientId: string;
      clientName: string;
      email: string | null;
      createdAt: string;
    }>;
    openQuotes: Array<{
      quoteId: string;
      clientId: string | null;
      projectId: string | null;
      clientName: string;
      projectName: string | null;
      amount: number;
      linkedPaymentsTotal: number;
      remainingAmount: number;
      status: string;
      statusLabel: string;
      createdAt: string;
    }>;
    activeProjects: Array<{
      projectId: string;
      clientId: string | null;
      projectName: string;
      clientName: string | null;
      status: string;
      statusLabel: string;
      startDate: string | null;
    }>;
    pendingPayments: Array<{
      paymentId: string;
      quoteId: string | null;
      clientId: string | null;
      projectId: string | null;
      clientName: string | null;
      projectName: string | null;
      amount: number;
      status: string;
      statusLabel: string;
      paymentDate: string | null;
    }>;
    recentExpenses: Array<{
      expenseId: string;
      clientId: string | null;
      projectId: string | null;
      clientName: string | null;
      projectName: string | null;
      amount: number;
      expenseType: string;
      expenseTypeLabel: string;
      expenseDate: string;
      description: string | null;
    }>;
  };
  caveats: string[];
};

export const buildUnifiedCrmReadContext = ({
  clients,
  quotes,
  projects,
  payments,
  expenses,
  semanticRegistry,
  capabilityRegistry,
  generatedAt = new Date().toISOString(),
}: {
  clients: Client[];
  quotes: Quote[];
  projects: Project[];
  payments: Payment[];
  expenses: Expense[];
  semanticRegistry: CrmSemanticRegistry;
  capabilityRegistry: CrmCapabilityRegistry;
  generatedAt?: string;
}): UnifiedCrmReadContext => {
  const clientById = new Map(clients.map((client) => [String(client.id), client]));
  const projectById = new Map(
    projects.map((project) => [String(project.id), project]),
  );
  const paymentsByQuoteId = new Map<string, Payment[]>();

  payments.forEach((payment) => {
    if (!payment.quote_id) {
      return;
    }

    const quoteId = String(payment.quote_id);
    const current = paymentsByQuoteId.get(quoteId) ?? [];
    current.push(payment);
    paymentsByQuoteId.set(quoteId, current);
  });

  const openQuotes = quotes
    .filter((quote) => !openQuoteClosedStatuses.has(quote.status))
    .sort((left, right) => toDateValue(right.created_at) - toDateValue(left.created_at));
  const activeProjects = projects
    .filter((project) => !inactiveProjectStatuses.has(project.status))
    .sort((left, right) => toDateValue(right.start_date) - toDateValue(left.start_date));
  const pendingPayments = payments
    .filter(
      (payment) =>
        payment.status !== "ricevuto" && payment.payment_type !== "rimborso",
    )
    .sort(
      (left, right) =>
        toDateValue(left.payment_date ?? left.created_at) -
        toDateValue(right.payment_date ?? right.created_at),
    );
  const recentExpenses = [...expenses].sort(
    (left, right) => toDateValue(right.expense_date) - toDateValue(left.expense_date),
  );
  const recentClients = [...clients].sort(
    (left, right) => toDateValue(right.created_at) - toDateValue(left.created_at),
  );

  const openQuotesAmount = openQuotes.reduce(
    (sum, quote) => sum + Number(quote.amount ?? 0),
    0,
  );
  const pendingPaymentsAmount = pendingPayments.reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0,
  );
  const expensesAmount = recentExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount ?? 0),
    0,
  );

  return {
    meta: {
      generatedAt,
      generatedAtLabel: formatDateTimeLabel(generatedAt),
      businessTimezone: "Europe/Rome",
      routePrefix: capabilityRegistry.routing.routePrefix,
      scope: "crm_read_snapshot",
    },
    registries: {
      semantic: semanticRegistry,
      capability: capabilityRegistry,
    },
    snapshot: {
      counts: {
        clients: clients.length,
        quotes: quotes.length,
        openQuotes: openQuotes.length,
        activeProjects: activeProjects.length,
        pendingPayments: pendingPayments.length,
        expenses: expenses.length,
      },
      totals: {
        openQuotesAmount,
        pendingPaymentsAmount,
        expensesAmount,
      },
      recentClients: recentClients.slice(0, 5).map((client) => ({
        clientId: String(client.id),
        clientName: client.name,
        email: client.email ?? null,
        createdAt: client.created_at,
      })),
      openQuotes: openQuotes.slice(0, 5).map((quote) => {
        const paymentSummary = buildQuotePaymentsSummary({
          quoteAmount: Number(quote.amount ?? 0),
          payments: paymentsByQuoteId.get(String(quote.id)) ?? [],
        });

        return {
          quoteId: String(quote.id),
          clientId: quote.client_id ? String(quote.client_id) : null,
          projectId: quote.project_id ? String(quote.project_id) : null,
          clientName:
            getClientName(clientById, quote.client_id) ?? "Cliente non trovato",
          projectName: getProjectName(projectById, quote.project_id ?? null),
          amount: Number(quote.amount ?? 0),
          linkedPaymentsTotal: paymentSummary.linkedTotal,
          remainingAmount: paymentSummary.remainingAmount,
          status: quote.status,
          statusLabel: quoteStatusLabels[quote.status] ?? quote.status,
          createdAt: quote.created_at,
        };
      }),
      activeProjects: activeProjects.slice(0, 5).map((project) => ({
        projectId: String(project.id),
        clientId: project.client_id ? String(project.client_id) : null,
        projectName: project.name,
        clientName: getClientName(clientById, project.client_id),
        status: project.status,
        statusLabel: projectStatusLabels[project.status] ?? project.status,
        startDate: project.start_date ?? null,
      })),
      pendingPayments: pendingPayments.slice(0, 5).map((payment) => ({
        paymentId: String(payment.id),
        quoteId: payment.quote_id ? String(payment.quote_id) : null,
        clientId: payment.client_id ? String(payment.client_id) : null,
        projectId: payment.project_id ? String(payment.project_id) : null,
        clientName: getClientName(clientById, payment.client_id),
        projectName: getProjectName(projectById, payment.project_id ?? null),
        amount: Number(payment.amount ?? 0),
        status: payment.status,
        statusLabel: paymentStatusLabels[payment.status] ?? payment.status,
        paymentDate: payment.payment_date ?? null,
      })),
      recentExpenses: recentExpenses.slice(0, 5).map((expense) => ({
        expenseId: String(expense.id),
        clientId: expense.client_id ? String(expense.client_id) : null,
        projectId: expense.project_id ? String(expense.project_id) : null,
        clientName: getClientName(clientById, expense.client_id ?? null),
        projectName: getProjectName(projectById, expense.project_id ?? null),
        amount: Number(expense.amount ?? 0),
        expenseType: expense.expense_type,
        expenseTypeLabel:
          expenseTypeLabels[expense.expense_type] ?? expense.expense_type,
        expenseDate: expense.expense_date,
        description: expense.description ?? null,
      })),
    },
    caveats: [
      "Questo snapshot e' read-only: nessuna scrittura nel CRM parte da questo contesto o dalle risposte AI che lo usano senza una conferma esplicita in un workflow dedicato.",
      "I significati di stati, tipi, formule e route vanno letti dai registri semantico e capability inclusi nel contesto.",
      "Le liste recenti sono intenzionalmente limitate ai record piu utili per lettura rapida nel launcher unificato.",
    ],
  };
};
