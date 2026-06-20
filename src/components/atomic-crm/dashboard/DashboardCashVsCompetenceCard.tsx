import { useState } from "react";
import { ChevronDown, ChevronUp, Scale } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

import { formatCurrencyPrecise } from "./dashboardModel";
import type { CashVsCompetenceView } from "./cashVsCompetenceReconciliation";

const FULL_COVERAGE = 0.999;

/**
 * Read-only reconciliation card: CASH (legal) vs INVOICE-DATE competence (the
 * commercialista's method). It NEVER changes the legal number — it only explains
 * why the user's cash figures diverge from what the accountant declares.
 */
export const DashboardCashVsCompetenceCard = ({
  data,
  selectedYear,
  compact = false,
}: {
  data: CashVsCompetenceView | null;
  selectedYear: number;
  compact?: boolean;
}) => {
  const [bridgeOpen, setBridgeOpen] = useState(!compact);

  if (!data || data.byYear.length === 0) return null;

  const { byYear, bridge } = data;

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          Confronto col commercialista
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Per legge conti i soldi quando li{" "}
          <span className="font-medium">incassi</span> (cassa). Il
          commercialista li conta quando{" "}
          <span className="font-medium">emette la fattura</span>. Qui vedi la
          differenza.
        </p>
      </CardHeader>

      <CardContent className="px-4 space-y-3">
        {/* ── Per-year table: Cassa (legge) vs Data fattura (commercialista) ── */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            <span>Anno</span>
            <span className="text-right text-emerald-700 dark:text-emerald-400">
              Cassa (tu, per legge)
            </span>
            <span className="text-right">Data fattura (commercialista)</span>
          </div>

          {byYear.map((row) => {
            const partial =
              row.coverageRatio != null && row.coverageRatio < FULL_COVERAGE;
            const isSelected = row.year === selectedYear;
            return (
              <div
                key={row.year}
                className={`rounded-md ${isSelected ? "bg-muted/50" : ""} px-1.5 py-1`}
              >
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 items-baseline">
                  <span className="text-sm font-semibold tabular-nums">
                    {row.year}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatCurrencyPrecise(row.cashTaxable)}
                  </span>
                  <span className="text-right text-sm tabular-nums text-muted-foreground">
                    {formatCurrencyPrecise(row.competenceTaxable)}
                  </span>
                </div>
                {partial && (
                  <div className="mt-1 space-y-0.5">
                    <Progress
                      value={(row.coverageRatio ?? 0) * 100}
                      className="h-1"
                    />
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      {Math.round((row.coverageRatio ?? 0) * 100)}% degli
                      incassi ha una fattura collegata · competenza = stima
                      parziale
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* ── Cross-year bridge: the invoices that "move" between years ── */}
        {bridge.length > 0 ? (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setBridgeOpen((open) => !open)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {bridgeOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              Fatture a cavallo d&apos;anno ({bridge.length})
            </button>
            {bridgeOpen && (
              <ul className="space-y-1">
                {bridge.map((item) => (
                  <li
                    key={String(item.paymentId)}
                    className="text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {item.documentNumber}
                    </span>{" "}
                    · {formatCurrencyPrecise(item.amount)} · incassata{" "}
                    <span className="tabular-nums">{item.cashYear}</span>,
                    emessa{" "}
                    <span className="tabular-nums">{item.competenceYear}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nessuna fattura a cavallo d&apos;anno: cassa e data-fattura
            coincidono.
          </p>
        )}

        <p className="text-[11px] text-muted-foreground">
          La{" "}
          <span className="font-medium">Cassa è il tuo numero per legge</span>.
          La colonna data-fattura spiega solo la differenza col commercialista —
          non cambia cosa devi dichiarare.
        </p>
      </CardContent>
    </Card>
  );
};
