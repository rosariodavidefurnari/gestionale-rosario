import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { formatCompactCurrency } from "./dashboardModel";
import type { DashboardHistoryModel } from "./dashboardHistoryModel";

export const DashboardHistoricalTopClientsCard = ({
  model,
  isPending,
  hasError,
}: {
  model: DashboardHistoryModel;
  isPending: boolean;
  hasError: boolean;
}) => {
  const maxRevenue = model.topClients[0]?.revenue ?? 0;

  return (
    <Card className="gap-0">
      <CardHeader className="px-4 pb-3">
        <CardTitle className="text-base">Top clienti all-time</CardTitle>
        <p className="text-xs text-muted-foreground">
          Compensi maturati fino al {model.meta.asOfDateLabel}, non incassi.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {hasError ? (
          <p className="text-sm text-muted-foreground">
            Impossibile caricare i clienti lifetime.
          </p>
        ) : isPending && model.topClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Caricamento clienti lifetime...
          </p>
        ) : !model.topClients.length ? (
          <p className="text-sm text-muted-foreground">
            Nessun cliente storico disponibile fino al{" "}
            {model.meta.asOfDateLabel}.
          </p>
        ) : (
          <div className="space-y-4">
            {model.topClients.map((client, index) => (
              <div key={client.clientId} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="text-muted-foreground mr-2">
                      {index + 1}.
                    </span>
                    <span className="font-medium truncate">
                      {client.clientName}
                    </span>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatCompactCurrency(client.revenue)}
                  </span>
                </div>
                <Progress
                  value={maxRevenue ? (client.revenue / maxRevenue) * 100 : 0}
                />
                <p className="text-xs text-muted-foreground">
                  {client.projectsCount} progetti, {client.servicesCount}{" "}
                  servizi, {client.activeYearsCount} anni attivi
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
