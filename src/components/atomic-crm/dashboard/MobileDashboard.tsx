import { RefreshCw } from "lucide-react";
import { useTimeout } from "ra-core";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { useConfigurationContext } from "../root/ConfigurationContext";
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
      </div>
    </Wrapper>
  );
};
