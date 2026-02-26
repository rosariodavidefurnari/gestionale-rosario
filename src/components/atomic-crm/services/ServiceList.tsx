import jsonExport from "jsonexport/dist";
import { downloadCSV, useListContext, type Exporter } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SortButton } from "@/components/admin/sort-button";

import type { Project, Service } from "../types";
import { ServiceListContent } from "./ServiceListContent";
import { ServiceListFilter } from "./ServiceListFilter";
import { TopToolbar } from "../layout/TopToolbar";
import { serviceTypeLabels } from "./serviceTypes";

export const ServiceList = () => (
  <List
    title={false}
    actions={<ServiceListActions />}
    perPage={50}
    sort={{ field: "service_date", order: "DESC" }}
    exporter={exporter}
  >
    <ServiceListLayout />
  </List>
);

const ServiceListLayout = () => {
  const { data, isPending, filterValues } = useListContext();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;
  if (!data?.length && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground mb-4">Nessun servizio registrato</p>
        <CreateButton />
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-8">
      <ServiceListFilter />
      <div className="w-full flex flex-col gap-4 overflow-x-auto">
        <ServiceListContent />
      </div>
    </div>
  );
};

const ServiceListActions = () => (
  <TopToolbar>
    <SortButton fields={["service_date", "created_at"]} />
    <ExportButton exporter={exporter} />
    <CreateButton />
  </TopToolbar>
);

const exporter: Exporter<Service> = async (
  records,
  fetchRelatedRecords,
) => {
  const projects = await fetchRelatedRecords<Project>(
    records,
    "project_id",
    "projects",
  );
  const rows = records.map((s) => ({
    data: s.service_date,
    progetto: projects[s.project_id]?.name ?? "",
    tipo: serviceTypeLabels[s.service_type] ?? s.service_type,
    riprese: s.fee_shooting,
    montaggio: s.fee_editing,
    altro: s.fee_other,
    sconto: s.discount,
    totale: s.fee_shooting + s.fee_editing + s.fee_other - s.discount,
    km: s.km_distance,
    rimborso_km: (s.km_distance * s.km_rate).toFixed(2),
    localita: s.location ?? "",
    rif_fattura: s.invoice_ref ?? "",
    note: s.notes ?? "",
  }));
  return jsonExport(rows, {}, (_err: any, csv: string) => {
    downloadCSV(csv, "registro_lavori");
  });
};
