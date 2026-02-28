import {
  AlertTriangle,
  Calculator,
  PiggyBank,
  Shield,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { formatCurrency, formatCurrencyPrecise } from "./dashboardModel";
import type { FiscalKpis, FiscalWarning } from "./fiscalModel";

export const DashboardFiscalKpis = ({
  fiscalKpis,
  warnings,
}: {
  fiscalKpis: FiscalKpis;
  warnings: FiscalWarning[];
}) => {
  const hasCeilingWarning = warnings.some(
    (w) => w.type === "ceiling_exceeded" || w.type === "ceiling_critical",
  );
  const reliabilityLabel =
    fiscalKpis.monthsOfData < 3
      ? "Stima preliminare"
      : `Stima basata su ${fiscalKpis.monthsOfData} mesi`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Net income */}
      <Card className="gap-3 py-4">
        <CardHeader className="px-4 pb-0 flex flex-row items-center justify-between space-y-0 gap-2">
          <CardTitle className="text-sm font-medium">
            Reddito netto stimato
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-4 space-y-2">
          <div className="text-2xl font-semibold tracking-tight">
            {formatCurrency(fiscalKpis.redditoNettoStimato)}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {Math.round(fiscalKpis.percentualeNetto)}% netto
            </Badge>
            <span>{reliabilityLabel}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tax estimates */}
      <Card className="gap-3 py-4">
        <CardHeader className="px-4 pb-0 flex flex-row items-center justify-between space-y-0 gap-2">
          <CardTitle className="text-sm font-medium">
            Stima tasse annuali
          </CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-4 space-y-2">
          <div className="text-2xl font-semibold tracking-tight">
            {formatCurrency(
              fiscalKpis.stimaInpsAnnuale + fiscalKpis.stimaImpostaAnnuale,
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              INPS: {formatCurrencyPrecise(fiscalKpis.stimaInpsAnnuale)}
            </p>
            <p>
              Imposta {fiscalKpis.aliquotaSostitutiva}%:{" "}
              {formatCurrencyPrecise(fiscalKpis.stimaImpostaAnnuale)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Monthly set-aside */}
      <Card className="gap-3 py-4">
        <CardHeader className="px-4 pb-0 flex flex-row items-center justify-between space-y-0 gap-2">
          <CardTitle className="text-sm font-medium">
            Accantonamento mensile
          </CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-4 space-y-2">
          <div className="text-2xl font-semibold tracking-tight">
            {formatCurrencyPrecise(fiscalKpis.accantonamentoMensile)}
          </div>
          <p className="text-xs text-muted-foreground">
            Da accantonare ogni mese per tasse e contributi
          </p>
        </CardContent>
      </Card>

      {/* Ceiling distance */}
      <Card
        className={`gap-3 py-4 ${hasCeilingWarning ? "border-destructive" : ""}`}
      >
        <CardHeader className="px-4 pb-0 flex flex-row items-center justify-between space-y-0 gap-2">
          <CardTitle className="text-sm font-medium">
            Distanza dal tetto
          </CardTitle>
          {hasCeilingWarning ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Shield className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent className="px-4 space-y-2">
          <div className="text-2xl font-semibold tracking-tight">
            {formatCurrency(Math.abs(fiscalKpis.distanzaDalTetto))}
            {fiscalKpis.distanzaDalTetto < 0 ? " oltre" : ""}
          </div>
          <Progress
            value={Math.min(100, fiscalKpis.percentualeUtilizzoTetto)}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            {Math.round(fiscalKpis.percentualeUtilizzoTetto)}% del tetto
            utilizzato
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
