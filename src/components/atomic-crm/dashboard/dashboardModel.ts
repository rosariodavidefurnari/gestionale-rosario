import { format } from "date-fns";
import { it as itLocale } from "date-fns/locale";

import type {
  Client,
  Expense,
  FiscalConfig,
  Payment,
  Project,
  Quote,
  Service,
} from "../types";
import { quoteStatusLabels } from "../quotes/quotesTypes";
import { buildFiscalModel, type FiscalModel } from "./fiscalModel";

export type MonthlyRevenueRow = {
  id?: string | number;
  month: string;
  category: string;
  revenue: number | string | null;
  total_km: number | string | null;
  km_cost: number | string | null;
};

export type DashboardModel = {
  kpis: DashboardKpis;
  revenueTrend: RevenueTrendPoint[];
  categoryBreakdown: CategoryBreakdownPoint[];
  quotePipeline: QuotePipelinePoint[];
  topClients: TopClientPoint[];
  alerts: DashboardAlerts;
  fiscal: FiscalModel | null;
};

export type DashboardKpis = {
  monthlyRevenue: number;
  previousMonthRevenue: number;
  monthlyRevenueDeltaPct: number | null;
  annualRevenue: number;
  pendingPaymentsTotal: number;
  pendingPaymentsCount: number;
  openQuotesCount: number;
  openQuotesAmount: number;
  monthlyKm: number;
  monthlyKmCost: number;
};

export type RevenueTrendPoint = {
  monthKey: string;
  label: string;
  revenue: number;
  kmCost: number;
};

export type CategoryBreakdownPoint = {
  category: string;
  label: string;
  revenue: number;
};

export type QuotePipelinePoint = {
  status: string;
  label: string;
  count: number;
  amount: number;
};

export type TopClientPoint = {
  clientId: string;
  clientName: string;
  revenue: number;
};

export type DashboardAlerts = {
  paymentAlerts: PaymentAlert[];
  upcomingServices: UpcomingServiceAlert[];
  unansweredQuotes: UnansweredQuoteAlert[];
};

export type PaymentAlert = {
  id: string;
  clientName: string;
  projectName?: string;
  notes?: string;
  amount: number;
  status: string;
  urgency: "overdue" | "due_soon" | "pending";
  paymentDate?: string;
  daysOffset?: number;
};

export type UpcomingServiceAlert = {
  id: string;
  serviceDate: string;
  serviceEnd?: string;
  allDay: boolean;
  projectName: string;
  clientName: string;
  serviceType: string;
  daysAhead: number;
};

export type UnansweredQuoteAlert = {
  id: string;
  clientName: string;
  description: string;
  status: string;
  sentDate: string;
  daysWaiting: number;
  amount: number;
};

export const projectCategoryLabels: Record<string, string> = {
  produzione_tv: "Produzione TV",
  spot: "Spot",
  wedding: "Wedding",
  evento_privato: "Evento privato",
  sviluppo_web: "Sviluppo web",
};

const quotePipelineOrder = [
  "primo_contatto",
  "preventivo_inviato",
  "in_trattativa",
  "accettato",
  "acconto_ricevuto",
  "in_lavorazione",
  "completato",
  "saldato",
  "rifiutato",
  "perso",
] as const;

const quoteClosedForOpenKpi = new Set(["saldato", "rifiutato", "perso", "completato"]);
const unansweredQuoteStatuses = new Set(["preventivo_inviato", "in_trattativa"]);

export const formatCurrency = (value: number) =>
  value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

export const formatCurrencyPrecise = (value: number) =>
  value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

export const formatCompactCurrency = (value: number) =>
  value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  });

export const formatShortDate = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "--";
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
  });
};

export const formatDayMonth = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "--";
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
};

export const getCategoryLabel = (category: string) =>
  projectCategoryLabels[category] ?? category;

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const diffDays = (from: Date, to: Date) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((toStartOfDay(to).valueOf() - toStartOfDay(from).valueOf()) / msPerDay);
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (date: Date) =>
  format(date, "MMM yy", { locale: itLocale }).replace(".", "");

const getServiceNetRevenue = (service: Service) =>
  toNumber(service.fee_shooting) +
  toNumber(service.fee_editing) +
  toNumber(service.fee_other) -
  toNumber(service.discount);

const isCurrentYear = (value?: string, year = new Date().getFullYear()) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return false;
  return date.getFullYear() === year;
};

const getSortedMonthStarts = (count: number) => {
  const now = new Date();
  const items: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    items.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return items;
};

export const buildDashboardModel = ({
  monthlyRevenueRows,
  payments,
  quotes,
  services,
  projects,
  clients,
  expenses,
  fiscalConfig,
}: {
  monthlyRevenueRows: MonthlyRevenueRow[];
  payments: Payment[];
  quotes: Quote[];
  services: Service[];
  projects: Project[];
  clients: Client[];
  expenses: Expense[];
  fiscalConfig?: FiscalConfig;
}): DashboardModel => {
  const now = new Date();
  const today = toStartOfDay(now);
  const currentYear = now.getFullYear();
  const currentMonthKey = monthKey(now);
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = monthKey(previousMonthDate);

  const monthlyTotals = new Map<string, { revenue: number; totalKm: number; kmCost: number }>();
  const categoryTotals = new Map<string, number>();

  for (const row of monthlyRevenueRows) {
    const rowDate = new Date(row.month);
    if (Number.isNaN(rowDate.valueOf())) continue;
    const key = monthKey(rowDate);
    const bucket = monthlyTotals.get(key) ?? { revenue: 0, totalKm: 0, kmCost: 0 };
    bucket.revenue += toNumber(row.revenue);
    bucket.totalKm += toNumber(row.total_km);
    bucket.kmCost += toNumber(row.km_cost);
    monthlyTotals.set(key, bucket);

    if (rowDate.getFullYear() === currentYear) {
      categoryTotals.set(row.category, (categoryTotals.get(row.category) ?? 0) + toNumber(row.revenue));
    }
  }

  const revenueTrend = getSortedMonthStarts(12).map((date) => {
    const key = monthKey(date);
    const values = monthlyTotals.get(key) ?? { revenue: 0, totalKm: 0, kmCost: 0 };
    return {
      monthKey: key,
      label: monthLabel(date),
      revenue: values.revenue,
      kmCost: values.kmCost,
    };
  });

  const currentMonthTotals = monthlyTotals.get(currentMonthKey) ?? {
    revenue: 0,
    totalKm: 0,
    kmCost: 0,
  };
  const previousMonthTotals = monthlyTotals.get(previousMonthKey) ?? {
    revenue: 0,
    totalKm: 0,
    kmCost: 0,
  };

  const monthlyRevenueDeltaPct =
    previousMonthTotals.revenue > 0
      ? ((currentMonthTotals.revenue - previousMonthTotals.revenue) / previousMonthTotals.revenue) * 100
      : currentMonthTotals.revenue > 0
        ? 100
        : null;

  const annualRevenue = Array.from(monthlyTotals.entries()).reduce((sum, [key, value]) => {
    if (key.startsWith(`${currentYear}-`)) {
      return sum + value.revenue;
    }
    return sum;
  }, 0);

  // Exclude refunds from pending alerts (refunds are outgoing, not incoming)
  const pendingPayments = payments.filter(
    (payment) => payment.status !== "ricevuto" && payment.payment_type !== "rimborso",
  );
  const pendingPaymentsTotal = pendingPayments.reduce(
    (sum, payment) => sum + toNumber(payment.amount),
    0,
  );

  const openQuotes = quotes.filter((quote) => !quoteClosedForOpenKpi.has(quote.status));
  const openQuotesAmount = openQuotes.reduce((sum, quote) => sum + toNumber(quote.amount), 0);

  const quotePipelineSeed = new Map<string, QuotePipelinePoint>(
    quotePipelineOrder.map((status) => [
      status,
      {
        status,
        label: quoteStatusLabels[status] ?? status,
        count: 0,
        amount: 0,
      },
    ]),
  );

  for (const quote of quotes) {
    const bucket = quotePipelineSeed.get(quote.status);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.amount += toNumber(quote.amount);
  }

  const quotePipeline = quotePipelineOrder.map((status) => quotePipelineSeed.get(status)!);

  const projectById = new Map(projects.map((project) => [String(project.id), project]));
  const clientById = new Map(clients.map((client) => [String(client.id), client]));

  const topClientRevenue = new Map<string, number>();
  for (const service of services) {
    if (!isCurrentYear(service.service_date, currentYear)) continue;
    const project = projectById.get(String(service.project_id));
    if (!project) continue;
    const clientId = String(project.client_id);
    topClientRevenue.set(
      clientId,
      (topClientRevenue.get(clientId) ?? 0) + getServiceNetRevenue(service),
    );
  }

  const topClients = Array.from(topClientRevenue.entries())
    .map(([clientId, revenue]) => ({
      clientId,
      clientName: clientById.get(clientId)?.name ?? "Cliente",
      revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const categoryBreakdown = Array.from(categoryTotals.entries())
    .map(([category, revenue]) => ({
      category,
      label: getCategoryLabel(category),
      revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const paymentAlerts = pendingPayments
    .map((payment) => {
      const paymentDate = payment.payment_date;
      const parsedDate = paymentDate ? new Date(paymentDate) : null;
      const validDate = parsedDate && !Number.isNaN(parsedDate.valueOf()) ? parsedDate : null;
      const clientName = clientById.get(String(payment.client_id))?.name ?? "Cliente";
      const project = payment.project_id ? projectById.get(String(payment.project_id)) : undefined;
      const daysOffset = validDate ? diffDays(today, validDate) : undefined;
      const isOverdue = payment.status === "scaduto" || (daysOffset != null && daysOffset < 0);
      const isDueSoon = daysOffset != null && daysOffset >= 0 && daysOffset <= 14;
      const urgency: PaymentAlert["urgency"] = isOverdue
        ? "overdue"
        : isDueSoon
          ? "due_soon"
          : "pending";
      return {
        id: String(payment.id),
        clientName,
        projectName: project?.name,
        notes: payment.notes,
        amount: toNumber(payment.amount),
        status: isOverdue ? "scaduto" : payment.status,
        urgency,
        paymentDate,
        daysOffset,
      } satisfies PaymentAlert;
    })
    .sort((a, b) => {
      const urgencyOrder = { overdue: 0, due_soon: 1, pending: 2 };
      const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (diff !== 0) return diff;
      return (a.daysOffset ?? 999) - (b.daysOffset ?? 999);
    })
    .slice(0, 10);

  const upcomingServices = services
    .map((service) => {
      const date = new Date(service.service_date);
      if (Number.isNaN(date.valueOf())) return null;
      const daysAhead = diffDays(today, date);
      if (daysAhead < 0 || daysAhead > 14) return null;
      const project = projectById.get(String(service.project_id));
      const clientName = project ? clientById.get(String(project.client_id))?.name ?? "Cliente" : "Cliente";
      return {
        id: String(service.id),
        serviceDate: service.service_date,
        serviceEnd: service.service_end ?? undefined,
        allDay: service.all_day,
        projectName: project?.name ?? "Progetto",
        clientName,
        serviceType: service.service_type,
        daysAhead,
      } satisfies UpcomingServiceAlert;
    })
    .filter((item): item is UpcomingServiceAlert => item !== null)
    .sort((a, b) => a.daysAhead - b.daysAhead)
    .slice(0, 6);

  const unansweredThreshold = addDays(today, -7);
  const unansweredQuotes = quotes
    .map((quote) => {
      if (!unansweredQuoteStatuses.has(quote.status)) return null;
      if (!quote.sent_date || quote.response_date) return null;
      const sentDate = new Date(quote.sent_date);
      if (Number.isNaN(sentDate.valueOf())) return null;
      if (sentDate > unansweredThreshold) return null;
      return {
        id: String(quote.id),
        clientName: clientById.get(String(quote.client_id))?.name ?? "Cliente",
        description: quote.description || "Preventivo",
        status: quote.status,
        sentDate: quote.sent_date,
        daysWaiting: Math.abs(diffDays(sentDate, today)),
        amount: toNumber(quote.amount),
      } satisfies UnansweredQuoteAlert;
    })
    .filter((item): item is UnansweredQuoteAlert => item !== null)
    .sort((a, b) => b.daysWaiting - a.daysWaiting)
    .slice(0, 6);

  const fiscal = fiscalConfig
    ? buildFiscalModel({
        services,
        expenses,
        payments,
        quotes,
        projects,
        clients,
        fiscalConfig,
      })
    : null;

  return {
    kpis: {
      monthlyRevenue: currentMonthTotals.revenue,
      previousMonthRevenue: previousMonthTotals.revenue,
      monthlyRevenueDeltaPct,
      annualRevenue,
      pendingPaymentsTotal,
      pendingPaymentsCount: pendingPayments.length,
      openQuotesCount: openQuotes.length,
      openQuotesAmount,
      monthlyKm: currentMonthTotals.totalKm,
      monthlyKmCost: currentMonthTotals.kmCost,
    },
    revenueTrend,
    categoryBreakdown,
    quotePipeline,
    topClients,
    alerts: {
      paymentAlerts,
      upcomingServices,
      unansweredQuotes,
    },
    fiscal,
  };
};
