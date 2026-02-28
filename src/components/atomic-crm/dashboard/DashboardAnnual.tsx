import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Welcome } from "./Welcome";
import { DashboardAlertsCard } from "./DashboardAlertsCard";
import { DashboardAtecoChart } from "./DashboardAtecoChart";
import { DashboardBusinessHealthCard } from "./DashboardBusinessHealthCard";
import { DashboardCategoryChart } from "./DashboardCategoryChart";
import { DashboardDeadlinesCard } from "./DashboardDeadlinesCard";
import { DashboardFiscalKpis } from "./DashboardFiscalKpis";
import { DashboardKpiCards } from "./DashboardKpiCards";
import { DashboardLoading } from "./DashboardLoading";
import { DashboardPipelineCard } from "./DashboardPipelineCard";
import { DashboardRevenueTrendChart } from "./DashboardRevenueTrendChart";
import { DashboardTopClientsCard } from "./DashboardTopClientsCard";
import { useDashboardData } from "./useDashboardData";

const currentYear = new Date().getFullYear();

export const DashboardAnnual = () => {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { data, isPending, error, refetch } = useDashboardData(selectedYear);
  const isCurrentYear = data?.isCurrentYear ?? selectedYear === currentYear;

  if (isPending || !data) {
    if (error) {
      return <DashboardAnnualError onRetry={refetch} />;
    }
    return <DashboardLoading />;
  }

  return (
    <div className="space-y-6">
      {import.meta.env.VITE_IS_DEMO === "true" ? <Welcome /> : null}

      <YearSelector
        year={selectedYear}
        onPrev={() => setSelectedYear((y) => y - 1)}
        onNext={() => setSelectedYear((y) => Math.min(y + 1, currentYear))}
        isCurrentYear={isCurrentYear}
      />

      <DashboardKpiCards kpis={data.kpis} year={data.selectedYear} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardRevenueTrendChart
          data={data.revenueTrend}
          year={data.selectedYear}
          isCurrentYear={isCurrentYear}
        />
        <DashboardCategoryChart
          data={data.categoryBreakdown}
          year={data.selectedYear}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="grid grid-cols-1 gap-6">
          <DashboardPipelineCard data={data.quotePipeline} />
          <DashboardTopClientsCard
            data={data.topClients}
            year={data.selectedYear}
          />
        </div>
        {isCurrentYear && <DashboardAlertsCard alerts={data.alerts} />}
      </div>

      {data.fiscal ? (
        <>
          <h2 className="text-xl font-semibold mt-2">
            {isCurrentYear
              ? "Fiscale & Salute Aziendale"
              : `Riepilogo Fiscale ${selectedYear}`}
          </h2>

          {isCurrentYear && data.fiscal.warnings.length > 0 && (
            <div className="space-y-2">
              {data.fiscal.warnings.map((w) => (
                <div
                  key={w.type}
                  className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                    w.type === "ceiling_critical"
                      ? "bg-destructive/10 text-destructive"
                      : w.type === "ceiling_exceeded"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {w.message}
                </div>
              ))}
            </div>
          )}

          <DashboardFiscalKpis
            fiscalKpis={data.fiscal.fiscalKpis}
            warnings={data.fiscal.warnings}
            isCurrentYear={isCurrentYear}
          />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <DashboardAtecoChart
              data={data.fiscal.atecoBreakdown}
              year={data.selectedYear}
            />
            {isCurrentYear && (
              <DashboardDeadlinesCard
                deadlines={data.fiscal.deadlines}
                isFirstYear={data.fiscal.deadlines.length === 0}
              />
            )}
          </div>

          {isCurrentYear && (
            <DashboardBusinessHealthCard health={data.fiscal.businessHealth} />
          )}
        </>
      ) : (
        <Card className="mt-2">
          <CardContent className="px-6 py-8 text-center">
            <Settings className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              Configura i parametri fiscali per visualizzare il simulatore
              fiscale e i KPI di salute aziendale.
            </p>
            <Link to="/settings">
              <Badge variant="outline" className="cursor-pointer">
                Impostazioni → Fiscale
              </Badge>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const YearSelector = ({
  year,
  onPrev,
  onNext,
  isCurrentYear,
}: {
  year: number;
  onPrev: () => void;
  onNext: () => void;
  isCurrentYear: boolean;
}) => (
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev}>
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <span className="text-lg font-semibold tabular-nums min-w-[4ch] text-center">
      {year}
    </span>
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={onNext}
      disabled={isCurrentYear}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
);

const DashboardAnnualError = ({ onRetry }: { onRetry: () => void }) => (
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
