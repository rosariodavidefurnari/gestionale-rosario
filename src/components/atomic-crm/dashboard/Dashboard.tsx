import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Welcome } from "./Welcome";
import { DashboardAlertsCard } from "./DashboardAlertsCard";
import { DashboardCategoryChart } from "./DashboardCategoryChart";
import { DashboardKpiCards } from "./DashboardKpiCards";
import { DashboardLoading } from "./DashboardLoading";
import { DashboardPipelineCard } from "./DashboardPipelineCard";
import { DashboardRevenueTrendChart } from "./DashboardRevenueTrendChart";
import { DashboardTopClientsCard } from "./DashboardTopClientsCard";
import { useDashboardData } from "./useDashboardData";

export const Dashboard = () => {
  const { data, isPending, error, refetch } = useDashboardData();

  if (isPending || !data) {
    if (error) {
      return <DashboardError onRetry={refetch} />;
    }
    return <DashboardLoading />;
  }

  return (
    <div className="space-y-6 mt-1">
      {import.meta.env.VITE_IS_DEMO === "true" ? <Welcome /> : null}

      <DashboardKpiCards kpis={data.kpis} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardRevenueTrendChart data={data.revenueTrend} />
        <DashboardCategoryChart data={data.categoryBreakdown} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="grid grid-cols-1 gap-6">
          <DashboardPipelineCard data={data.quotePipeline} />
          <DashboardTopClientsCard data={data.topClients} />
        </div>
        <DashboardAlertsCard alerts={data.alerts} />
      </div>
    </div>
  );
};

const DashboardError = ({ onRetry }: { onRetry: () => void }) => (
  <Card className="mt-1">
    <CardContent className="px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground mb-4">
        Impossibile caricare i dati della dashboard.
      </p>
      <Button variant="outline" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Riprova
      </Button>
    </CardContent>
  </Card>
);
