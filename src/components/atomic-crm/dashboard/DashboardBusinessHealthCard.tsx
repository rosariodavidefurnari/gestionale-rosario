import {
  BarChart3,
  CircleDollarSign,
  Clock,
  Target,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { formatCurrency } from "./dashboardModel";
import type { BusinessHealthKpis } from "./fiscalModel";

export const DashboardBusinessHealthCard = ({
  health,
}: {
  health: BusinessHealthKpis;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Salute aziendale</CardTitle>
    </CardHeader>
    <CardContent className="space-y-5">
      {/* Quote conversion */}
      <div className="flex items-start gap-3">
        <Target className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Conversione preventivi
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {Math.round(health.quoteConversionRate)}%
              </span>
              <ConversionBadge rate={health.quoteConversionRate} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {health.quotesAccepted}/{health.quotesTotal} accettati
          </p>
        </div>
      </div>

      {/* DSO */}
      <div className="flex items-start gap-3">
        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Tempi medi di incasso
            </span>
            <div className="flex items-center gap-2">
              {health.dso != null ? (
                <>
                  <span className="text-sm font-semibold">
                    {health.dso}g
                  </span>
                  <DsoBadge days={health.dso} />
                </>
              ) : (
                <span
                  className="text-sm text-muted-foreground"
                  title="Dati insufficienti per calcolare i giorni medi di incasso"
                >
                  N/D
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Client concentration */}
      <div className="flex items-start gap-3">
        <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Concentrazione clienti
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {Math.round(health.clientConcentration)}%
              </span>
              <ConcentrationBadge pct={health.clientConcentration} />
            </div>
          </div>
          <Progress
            value={Math.min(100, health.clientConcentration)}
            className="h-1.5"
          />
          <p className="text-xs text-muted-foreground">
            Fatturato top 3 clienti su totale
          </p>
        </div>
      </div>

      {/* Weighted pipeline */}
      <div className="flex items-start gap-3">
        <CircleDollarSign className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pipeline ponderata</span>
            <span className="text-sm font-semibold">
              {formatCurrency(health.weightedPipelineValue)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Valore atteso da preventivi aperti
          </p>
        </div>
      </div>

      {/* Margin per category */}
      {health.marginPerCategory.length > 0 && (
        <div className="flex items-start gap-3">
          <BarChart3 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="flex-1 space-y-2">
            <span className="text-sm font-medium">
              Margine per categoria
            </span>
            <div className="space-y-1.5">
              {health.marginPerCategory.map((cat) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <span className="text-xs w-24 truncate">
                    {cat.label}
                  </span>
                  <Progress
                    value={Math.max(0, Math.min(100, cat.margin))}
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs font-medium w-10 text-right">
                    {Math.round(cat.margin)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const ConversionBadge = ({ rate }: { rate: number }) => {
  if (rate >= 50) return <Badge variant="success">Ottimo</Badge>;
  if (rate >= 30) return <Badge variant="secondary">Buono</Badge>;
  return <Badge variant="outline">Basso</Badge>;
};

const DsoBadge = ({ days }: { days: number }) => {
  if (days <= 30) return <Badge variant="success">Ottimo</Badge>;
  if (days <= 60) return <Badge variant="secondary">Nella norma</Badge>;
  return <Badge variant="destructive">Critico</Badge>;
};

const ConcentrationBadge = ({ pct }: { pct: number }) => {
  if (pct < 50) return <Badge variant="success">Sano</Badge>;
  if (pct < 80) return <Badge variant="secondary">Moderato</Badge>;
  return <Badge variant="destructive">Rischio alto</Badge>;
};
