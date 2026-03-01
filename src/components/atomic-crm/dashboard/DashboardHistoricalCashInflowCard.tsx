import { useQuery } from "@tanstack/react-query";

import type { CrmDataProvider } from "../providers/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDataProvider } from "ra-core";

const formatAsOfDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString("it-IT");
};

const formatCurrency = (value: number) =>
  value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const formatCountLabel = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

export const DashboardHistoricalCashInflowCard = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["historical-cash-inflow-context"],
    queryFn: () => dataProvider.getHistoricalCashInflowContext(),
  });

  if (error) {
    return (
      <Card className="gap-0">
        <CardHeader className="px-4 pb-3">
          <CardTitle className="text-base">
            Incassi ricevuti nel tempo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Impossibile caricare gli incassi storici.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Riprova
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isPending || !data) {
    return (
      <Card className="gap-0">
        <CardHeader className="px-4 pb-3">
          <CardTitle className="text-base">
            Incassi ricevuti nel tempo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-10 text-center text-sm text-muted-foreground">
          Caricamento incassi storici...
        </CardContent>
      </Card>
    );
  }

  if (data.series.yearlyCashInflow.length === 0) {
    return (
      <Card className="gap-0">
        <CardHeader className="px-4 pb-3">
          <CardTitle className="text-base">
            Incassi ricevuti nel tempo
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Qui guardi solo soldi già entrati, letti per data pagamento. Questo
            blocco resta separato dal valore del lavoro.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">
            Nessun incasso storico disponibile fino al{" "}
            {formatAsOfDate(data.meta.asOfDate)}.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalMetric = data.metrics.find(
    (metric) => metric.id === "historical_total_cash_inflow",
  );
  const latestClosedMetric = data.metrics.find(
    (metric) => metric.id === "latest_closed_year_cash_inflow",
  );
  const visibleRows = [...data.series.yearlyCashInflow].slice(-3).reverse();
  const maxCashInflow = Math.max(
    ...visibleRows.map((row) => row.cashInflow),
    0,
  );

  return (
    <Card className="gap-0">
      <CardHeader className="px-4 pb-3">
        <CardTitle className="text-base">Incassi ricevuti nel tempo</CardTitle>
        <p className="text-xs text-muted-foreground">
          Qui guardi solo soldi già entrati, letti per data pagamento. Questo
          blocco resta separato dal valore del lavoro.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Conta soldi entrati</Badge>
          <Badge variant="outline">
            Foto al {formatAsOfDate(data.meta.asOfDate)}
          </Badge>
          {visibleRows.some((row) => row.isYtd) ? (
            <Badge variant="outline">{data.meta.currentYear} finora</Badge>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {totalMetric?.label ?? "Incassi storici totali"}
            </p>
            <p className="mt-1 text-xl font-semibold">
              {totalMetric?.formattedValue ?? "N/D"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalMetric?.subtitle ??
                "Somma degli incassi ricevuti fino alla foto attuale."}
            </p>
          </div>

          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {latestClosedMetric?.label ?? "Ultimo anno chiuso incassato"}
            </p>
            <p className="mt-1 text-xl font-semibold">
              {latestClosedMetric?.formattedValue ?? "N/D"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestClosedMetric?.comparisonLabel
                ? `Qui guardi solo il ${latestClosedMetric.comparisonLabel}, ultimo anno chiuso disponibile.`
                : "Non esiste ancora un anno chiuso con incassi nella serie."}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Come si distribuiscono gli incassi
            </p>
            <p className="text-xs text-muted-foreground">
              Ultimi anni disponibili, senza confonderli con i compensi.
            </p>
          </div>

          {visibleRows.map((row) => (
            <div key={row.year} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium">
                    {row.year}
                    {row.isYtd ? " finora" : ""}
                  </span>
                  {row.isYtd ? (
                    <Badge variant="secondary">parziale</Badge>
                  ) : null}
                </div>
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatCurrency(row.cashInflow)}
                </span>
              </div>
              <Progress
                value={
                  maxCashInflow > 0 ? (row.cashInflow / maxCashInflow) * 100 : 0
                }
              />
              <p className="text-xs text-muted-foreground">
                {formatCountLabel(
                  row.paymentsCount,
                  "pagamento ricevuto",
                  "pagamenti ricevuti",
                )}{" "}
                · {formatCountLabel(row.projectsCount, "progetto", "progetti")}{" "}
                · {formatCountLabel(row.clientsCount, "cliente", "clienti")}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          {data.caveats[0]}
        </div>
      </CardContent>
    </Card>
  );
};
