import { AlertTriangle, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DashboardLoading } from "./DashboardLoading";
import { DashboardHistoricalCategoryMixChart } from "./DashboardHistoricalCategoryMixChart";
import { DashboardHistoricalAiSummaryCard } from "./DashboardHistoricalAiSummaryCard";
import { DashboardHistoricalKpis } from "./DashboardHistoricalKpis";
import { DashboardHistoricalRevenueChart } from "./DashboardHistoricalRevenueChart";
import { DashboardHistoricalTopClientsCard } from "./DashboardHistoricalTopClientsCard";
import { useHistoricalDashboardData } from "./useHistoricalDashboardData";

export const DashboardHistorical = () => {
  const { data, isPending, error, refetch, sectionState } =
    useHistoricalDashboardData();

  if (isPending || !data) {
    if (error) {
      return <DashboardHistoricalError onRetry={refetch} />;
    }
    return <DashboardLoading />;
  }

  if (data.isEmpty) {
    return (
      <Card>
        <CardContent className="px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Storico non disponibile: nessun servizio registrato fino al{" "}
            {data.meta.asOfDateLabel}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <HistoricalReadingGuide />

      <DashboardHistoricalKpis model={data} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardHistoricalRevenueChart model={data} />
        <DashboardHistoricalCategoryMixChart
          model={data}
          isPending={sectionState.categoryMix.isPending}
          hasError={!!sectionState.categoryMix.error}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <DashboardHistoricalTopClientsCard
          model={data}
          isPending={sectionState.topClients.isPending}
          hasError={!!sectionState.topClients.error}
        />
        <HistoricalContextCard model={data} />
      </div>

      <DashboardHistoricalAiSummaryCard />
    </div>
  );
};

const HistoricalReadingGuide = () => (
  <div className="rounded-xl border bg-card px-4 py-3">
    <p className="text-sm font-medium">Come leggere lo storico</p>
    <p className="text-xs text-muted-foreground mt-1">
      Qui stai guardando compensi per competenza, non incassi. L'anno corrente
      viene trattato come YTD e il YoY confronta solo gli ultimi due anni
      chiusi.
    </p>
  </div>
);

const HistoricalContextCard = ({
  model,
}: {
  model: NonNullable<ReturnType<typeof useHistoricalDashboardData>["data"]>;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Contesto dei dati</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Cosa stai vedendo</p>
        <p className="text-xs text-muted-foreground">
          Compensi maturati per competenza dal{" "}
          {model.meta.firstYearWithData ?? model.meta.currentYear} al{" "}
          {model.meta.currentYear}. {model.meta.currentYear} mostrato come YTD
          al {model.meta.asOfDateLabel}.
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Confronti consentiti</p>
        <p className="text-xs text-muted-foreground">
          Il KPI YoY usa solo anni chiusi:{" "}
          {model.kpis.yoyClosedYears.comparisonLabel}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Base: competenza</Badge>
        <Badge variant="outline">Timezone: {model.meta.businessTimezone}</Badge>
        <Badge variant="outline">As of: {model.meta.asOfDateLabel}</Badge>
      </div>

      {model.qualityFlags.includes("future_services_excluded") ? (
        <div className="rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 px-3 py-2 text-xs">
          Sono presenti servizi futuri, esclusi dal calcolo fino alla data di
          osservazione.
        </div>
      ) : null}

      {model.qualityFlags.includes("zero_baseline") ? (
        <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          YoY non confrontabile: l'anno base dell'ultimo confronto chiuso vale
          0.
        </div>
      ) : null}

      {model.qualityFlags.includes("insufficient_closed_years") ? (
        <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          YoY non disponibile: servono almeno due anni chiusi.
        </div>
      ) : null}
    </CardContent>
  </Card>
);

const DashboardHistoricalError = ({ onRetry }: { onRetry: () => void }) => (
  <Card>
    <CardContent className="px-6 py-10 text-center">
      <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm text-muted-foreground mb-4">
        Impossibile caricare lo storico aziendale.
      </p>
      <Button variant="outline" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Riprova
      </Button>
    </CardContent>
  </Card>
);
