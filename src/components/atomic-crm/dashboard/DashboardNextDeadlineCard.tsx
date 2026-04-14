import { useQuery } from "@tanstack/react-query";
import { useDataProvider, useGetList } from "ra-core";
import { AlertTriangle, CalendarClock, CheckCircle2, PiggyBank } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

import type { Payment } from "../types";
import type { CrmDataProvider } from "../providers/types";
import { computeTaxSchedule, type TaxSchedule } from "./computeTaxSchedule";
import { formatCurrencyPrecise } from "./dashboardModel";
import { formatBusinessDate, todayISODate } from "@/lib/dateTimezone";

const LARGE_PAGE = { page: 1, perPage: 1000 };

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatDateLong = (iso: string) =>
  formatBusinessDate(iso, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatDaysUntil = (days: number): string => {
  if (days < 0) return `scaduto da ${Math.abs(days)} giorni`;
  if (days === 0) return "oggi";
  if (days === 1) return "domani";
  return `tra ${days} giorni`;
};

const formatPercent = (ratio: number): string =>
  `${(ratio * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;

// ── Component ───────────────────────────────────────────────────────────────

export const DashboardNextDeadlineCard = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const todayIso = todayISODate();
  const currentYear = Number(todayIso.slice(0, 4));

  // Payments come from the standard ra-core resource so they share the cache
  // with the rest of the dashboard (useDashboardData already prefetches them).
  const paymentsQuery = useGetList<Payment>("payments", {
    pagination: LARGE_PAGE,
    sort: { field: "payment_date", order: "ASC" },
  });

  // Load the real fiscal data (declarations, obligations, F24 payments)
  const declarationsQuery = useQuery({
    queryKey: ["fiscal-declarations-all"],
    queryFn: () => dataProvider.listFiscalDeclarations(),
  });

  const obligationsQuery = useQuery({
    queryKey: ["fiscal-obligations", currentYear],
    queryFn: () => dataProvider.getFiscalObligations(currentYear),
  });

  // Also load next-year obligations in case we are late in the year
  const nextYearObligationsQuery = useQuery({
    queryKey: ["fiscal-obligations", currentYear + 1],
    queryFn: () => dataProvider.getFiscalObligations(currentYear + 1),
  });

  const paymentLinesQuery = useQuery({
    queryKey: ["fiscal-enriched-payment-lines", currentYear],
    queryFn: () => dataProvider.getEnrichedPaymentLinesForYear(currentYear),
  });

  const isLoading =
    paymentsQuery.isPending ||
    declarationsQuery.isPending ||
    obligationsQuery.isPending ||
    nextYearObligationsQuery.isPending ||
    paymentLinesQuery.isPending;

  if (isLoading) {
    return (
      <Card className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Prossime scadenze fiscali
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        </CardContent>
      </Card>
    );
  }

  const declarations = declarationsQuery.data ?? [];
  const obligations = [
    ...(obligationsQuery.data ?? []),
    ...(nextYearObligationsQuery.data ?? []),
  ];
  const paymentLines = paymentLinesQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  const schedule: TaxSchedule = computeTaxSchedule({
    declarations,
    obligations,
    payments,
    paymentLines,
    todayIso,
  });

  // Empty state: no baseline and no upcoming deadlines
  if (!schedule.baseline && schedule.upcomingDeadlines.length === 0) {
    return (
      <Card className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Prossime scadenze fiscali
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Nessuna dichiarazione storica trovata. Inserisci la dichiarazione
              dell&apos;anno scorso dal pulsante &quot;Dichiarazione&quot; per
              attivare le stime fiscali.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextDeadline = schedule.upcomingDeadlines[0];
  const secondDeadline = schedule.upcomingDeadlines[1];

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Tasse {currentYear}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 space-y-4">
        {/* ── 1. Salvadanaio YTD: tuoi vs tasse maturate ────────────── */}
        {schedule.ytd && schedule.baseline && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PiggyBank className="h-3.5 w-3.5" />
              <span>
                Incassato {currentYear}:{" "}
                <span className="font-medium text-foreground">
                  {formatCurrencyPrecise(schedule.ytd.revenueYtd)}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-medium">
                  Tuoi
                </p>
                <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                  {formatCurrencyPrecise(
                    schedule.ytd.revenueYtd - schedule.ytd.taxesMatured,
                  )}
                </p>
                <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70">
                  {formatPercent(1 - schedule.ytd.effectiveRate)}
                </p>
              </div>

              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400 font-medium">
                  Da tenere per tasse
                </p>
                <p className="text-xl font-bold text-amber-900 dark:text-amber-100">
                  {formatCurrencyPrecise(schedule.ytd.taxesMatured)}
                </p>
                <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">
                  {formatPercent(schedule.ytd.effectiveRate)}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Aliquota effettiva dichiarazione {schedule.baseline.taxYear}
              {" · "}
              {formatCurrencyPrecise(schedule.baseline.totalTaxes)} su{" "}
              {formatCurrencyPrecise(schedule.baseline.totalRevenue)}
            </p>
          </div>
        )}

        {/* ── 2. Next deadline (big, red-ish if soon) ────────────────── */}
        {nextDeadline && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Prossima scadenza
                  </p>
                  <p className="text-sm font-medium">
                    {formatDateLong(nextDeadline.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDaysUntil(nextDeadline.daysUntil)}
                  </p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyPrecise(nextDeadline.totalAmount)}
                </p>
              </div>

              <div className="rounded-md border border-border/40 bg-muted/30 p-2 space-y-1">
                {nextDeadline.items.map((item, idx) => (
                  <div
                    key={`${item.component}-${idx}`}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {item.label}
                      {item.competenceYear &&
                      item.competenceYear !== nextDeadline.daysUntil
                        ? ` ${item.competenceYear}`
                        : ""}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrencyPrecise(item.amount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress: how much of this deadline is already covered by the salvadanaio */}
              {schedule.ytd && schedule.ytd.taxesMatured > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Accantonato con il salvadanaio</span>
                    <span className="tabular-nums">
                      {formatCurrencyPrecise(
                        Math.min(
                          schedule.ytd.taxesMatured,
                          nextDeadline.totalAmount,
                        ),
                      )}{" "}
                      / {formatCurrencyPrecise(nextDeadline.totalAmount)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (schedule.ytd.taxesMatured / nextDeadline.totalAmount) *
                        100,
                    )}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 3. Second deadline (smaller) ────────────────────────────── */}
        {secondDeadline && (
          <>
            <Separator />
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Poi
                </p>
                <p className="text-sm font-medium">
                  {formatDateLong(secondDeadline.date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDaysUntil(secondDeadline.daysUntil)}
                </p>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrencyPrecise(secondDeadline.totalAmount)}
              </p>
            </div>
          </>
        )}

        {/* ── 4. Total year cash out ─────────────────────────────────── */}
        {schedule.totalCashOutYear > 0 && (
          <>
            <Separator />
            <div className="rounded-md bg-muted/50 p-2.5 space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium uppercase tracking-wide">
                  Totale cash out {currentYear}
                </span>
                <span className="text-lg font-bold tabular-nums">
                  {formatCurrencyPrecise(schedule.totalCashOutYear)}
                </span>
              </div>
              {schedule.totalSaldoPortion > 0 &&
                schedule.totalAnticipoPortion > 0 && (
                  <div className="space-y-0.5 text-[10px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Saldo anno scorso (tasse vere)</span>
                      <span className="tabular-nums">
                        {formatCurrencyPrecise(schedule.totalSaldoPortion)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Anticipo anno in corso (rientra)</span>
                      <span className="tabular-nums">
                        {formatCurrencyPrecise(schedule.totalAnticipoPortion)}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </>
        )}

        {/* ── Empty state: no upcoming deadlines ───────────────────── */}
        {schedule.upcomingDeadlines.length === 0 && schedule.baseline && (
          <>
            <Separator />
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
              <p>
                Nessuna scadenza fiscale aperta. Quando arriva il prossimo F24,
                registralo dal pulsante &quot;F24&quot;.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
