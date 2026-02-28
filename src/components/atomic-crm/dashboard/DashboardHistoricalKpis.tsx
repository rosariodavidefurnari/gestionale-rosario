import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  CircleDollarSign,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatCurrency } from "./dashboardModel";
import type {
  DashboardHistoryModel,
  HistoricalYoY,
} from "./dashboardHistoryModel";

export const DashboardHistoricalKpis = ({
  model,
}: {
  model: DashboardHistoryModel;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <HistoricalKpiCard
      title="Compensi storici totali"
      value={formatCurrency(model.kpis.totalHistoricalRevenue)}
      icon={<CircleDollarSign className="h-4 w-4" />}
      subtitle={`Compensi per competenza fino al ${model.meta.asOfDateLabel}.`}
    />
    <HistoricalKpiCard
      title="Miglior anno chiuso"
      value={
        model.kpis.bestClosedYear.revenue == null
          ? "N/D"
          : formatCurrency(model.kpis.bestClosedYear.revenue)
      }
      icon={<Trophy className="h-4 w-4" />}
      subtitle={
        model.kpis.bestClosedYear.year == null
          ? "Servono anni chiusi per calcolare il migliore."
          : `Anno ${model.kpis.bestClosedYear.year}.`
      }
    />
    <HistoricalKpiCard
      title="Ultimo anno chiuso"
      value={
        model.kpis.latestClosedYearRevenue.revenue == null
          ? "N/D"
          : formatCurrency(model.kpis.latestClosedYearRevenue.revenue)
      }
      icon={<CalendarRange className="h-4 w-4" />}
      subtitle={
        model.kpis.latestClosedYearRevenue.year == null
          ? "Ancora nessun anno chiuso disponibile."
          : `Anno ${model.kpis.latestClosedYearRevenue.year}.`
      }
    />
    <HistoricalKpiCard
      title="Crescita YoY"
      value={model.kpis.yoyClosedYears.formattedValue}
      icon={<YoYIcon yoy={model.kpis.yoyClosedYears} />}
      footer={<YoYFooter yoy={model.kpis.yoyClosedYears} />}
    />
  </div>
);

const HistoricalKpiCard = ({
  title,
  value,
  icon,
  subtitle,
  footer,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  footer?: React.ReactNode;
}) => (
  <Card className="gap-3 py-4">
    <CardHeader className="px-4 pb-0 flex flex-row items-center justify-between space-y-0 gap-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent className="px-4 space-y-2">
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {footer ??
        (subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null)}
    </CardContent>
  </Card>
);

const YoYFooter = ({ yoy }: { yoy: HistoricalYoY }) => {
  if (!yoy.isComparable) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{yoy.comparisonLabel}</span>
        <Badge variant="secondary">N/D</Badge>
      </div>
    );
  }

  const variant =
    yoy.valuePct == null
      ? "secondary"
      : yoy.valuePct > 0
        ? "success"
        : yoy.valuePct < 0
          ? "destructive"
          : "secondary";

  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>{yoy.comparisonLabel}</span>
      <Badge variant={variant}>{yoy.formattedValue}</Badge>
    </div>
  );
};

const YoYIcon = ({ yoy }: { yoy: HistoricalYoY }) => {
  if (!yoy.isComparable || yoy.valuePct == null || yoy.valuePct === 0) {
    return <CalendarRange className="h-4 w-4" />;
  }

  return yoy.valuePct > 0 ? (
    <ArrowUpRight className="h-4 w-4" />
  ) : (
    <ArrowDownRight className="h-4 w-4" />
  );
};
