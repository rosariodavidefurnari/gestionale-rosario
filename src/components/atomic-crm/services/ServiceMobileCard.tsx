import { useGetOne } from "ra-core";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import type { Service } from "../types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatDateRange } from "../misc/formatDateRange";
import { calculateServiceNetValue } from "@/lib/semantics/crmSemanticRegistry";
import { getServiceBillingState, isServiceBilled } from "./serviceBilling";

const eur = (n: number) =>
  n ? n.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : "--";

export const ServiceMobileCard = ({
  service,
  link,
}: {
  service: Service;
  link: string;
}) => {
  const { data: project } = useGetOne(
    "projects",
    { id: service.project_id! },
    { enabled: !!service.project_id },
  );
  const { serviceTypeChoices } = useConfigurationContext();
  const total = calculateServiceNetValue(service);
  const typeLabel =
    serviceTypeChoices.find((t) => t.value === service.service_type)?.label ??
    service.service_type;

  return (
    <Link
      to={link}
      className="flex flex-col gap-1 px-1 py-3 active:bg-muted/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatDateRange(
            service.service_date,
            service.service_end,
            service.all_day,
          )}
        </span>
        <span className="text-xs text-muted-foreground">{typeLabel}</span>
      </div>
      <span className="text-base font-bold">
        {service.description || project?.name || ""}
      </span>
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className={
            isServiceBilled(service)
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : "text-amber-700 bg-amber-50 border-amber-200"
          }
        >
          {getServiceBillingState(service).label}
        </Badge>
        <span className="text-sm font-semibold tabular-nums">
          EUR {eur(total)}
        </span>
      </div>
      {service.location ? (
        <span className="text-xs text-muted-foreground">
          {service.location}
        </span>
      ) : null}
    </Link>
  );
};
