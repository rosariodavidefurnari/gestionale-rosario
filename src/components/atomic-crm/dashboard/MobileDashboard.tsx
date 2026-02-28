import { CalendarClock, PiggyBank, Shield } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { useTimeout } from "ra-core";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatCurrency, formatCurrencyPrecise } from "./dashboardModel";
import type { FiscalModel } from "./fiscalModel";
import { Welcome } from "./Welcome";
import { DashboardKpiCards } from "./DashboardKpiCards";
import { MobileDashboardLoading } from "./DashboardLoading";
import { useDashboardData } from "./useDashboardData";

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();

  return (
    <>
      <MobileHeader>
        <div className="flex items-center gap-2 text-secondary-foreground no-underline py-3">
          <img className="[.light_&]:hidden h-6" src={darkModeLogo} alt={title} />
          <img className="[.dark_&]:hidden h-6" src={lightModeLogo} alt={title} />
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
      </MobileHeader>
      <MobileContent>{children}</MobileContent>
    </>
  );
};

export const MobileDashboard = () => {
  const { data, isPending, error, refetch } = useDashboardData();
  const showLoading = useTimeout(800);

  if ((isPending || !data) && !error) {
    return <Wrapper>{showLoading ? <MobileDashboardLoading /> : null}</Wrapper>;
  }

  if (error || !data) {
    return (
      <Wrapper>
        <Card>
          <CardContent className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Impossibile caricare la dashboard.
            </p>
            <Button variant="outline" onClick={refetch} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Riprova
            </Button>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="space-y-4 mt-1">
        {import.meta.env.VITE_IS_DEMO === "true" ? <Welcome /> : null}
        <DashboardKpiCards kpis={data.kpis} compact />
        {data.fiscal && <MobileFiscalKpis fiscal={data.fiscal} />}
      </div>
    </Wrapper>
  );
};

const getCeilingVariant = (pct: number) => {
  if (pct >= 90) return "destructive" as const;
  if (pct >= 70) return "warning" as const;
  return "success" as const;
};

const MobileFiscalKpis = ({ fiscal }: { fiscal: FiscalModel }) => {
  const { fiscalKpis, deadlines } = fiscal;
  const nextDeadline = deadlines.find((d) => !d.isPast);

  return (
    <div className="grid grid-cols-1 gap-3">
      {/* Monthly set-aside */}
      <Card className="gap-2 py-3">
        <CardHeader className="px-4 pb-0 flex flex-row items-center justify-between space-y-0 gap-2">
          <CardTitle className="text-sm font-medium">
            Accantonamento mensile
          </CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-4">
          <div className="text-xl font-semibold">
            {formatCurrencyPrecise(fiscalKpis.accantonamentoMensile)}
          </div>
        </CardContent>
      </Card>

      {/* Next deadline */}
      {nextDeadline && (
        <Card className="gap-2 py-3">
          <CardHeader className="px-4 pb-0 flex flex-row items-center justify-between space-y-0 gap-2">
            <CardTitle className="text-sm font-medium">
              Prossima scadenza
            </CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 space-y-1">
            <div className="text-xl font-semibold">
              {formatCurrency(nextDeadline.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(nextDeadline.date + "T00:00:00").toLocaleDateString(
                "it-IT",
                { day: "2-digit", month: "long" },
              )}{" "}
              — {nextDeadline.label} ({nextDeadline.daysUntil}g)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ceiling */}
      <Card className="gap-2 py-3">
        <CardHeader className="px-4 pb-0 flex flex-row items-center justify-between space-y-0 gap-2">
          <CardTitle className="text-sm font-medium">
            Tetto forfettario
          </CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-4 space-y-2">
          <Progress
            value={Math.min(100, fiscalKpis.percentualeUtilizzoTetto)}
            variant={getCeilingVariant(fiscalKpis.percentualeUtilizzoTetto)}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            {Math.round(fiscalKpis.percentualeUtilizzoTetto)}% utilizzato —{" "}
            {formatCurrency(Math.abs(fiscalKpis.distanzaDalTetto))}
            {fiscalKpis.distanzaDalTetto < 0 ? " oltre" : " rimanenti"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
