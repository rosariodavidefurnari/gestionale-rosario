import jsonExport from "jsonexport/dist";
import { downloadCSV, useListContext, type Exporter } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SortButton } from "@/components/admin/sort-button";

import type { Client, Project } from "../types";
import { ProjectListContent } from "./ProjectListContent";
import { ProjectListFilter } from "./ProjectListFilter";
import { TopToolbar } from "../layout/TopToolbar";

export const ProjectList = () => (
  <List
    title={false}
    actions={<ProjectListActions />}
    perPage={25}
    sort={{ field: "start_date", order: "DESC" }}
    exporter={exporter}
  >
    <ProjectListLayout />
  </List>
);

const ProjectListLayout = () => {
  const { data, isPending, filterValues } = useListContext();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;
  if (!data?.length && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground mb-4">Nessun progetto</p>
        <CreateButton />
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-8">
      <ProjectListFilter />
      <div className="w-full flex flex-col gap-4">
        <ProjectListContent />
      </div>
    </div>
  );
};

const ProjectListActions = () => (
  <TopToolbar>
    <SortButton fields={["name", "start_date", "created_at"]} />
    <ExportButton exporter={exporter} />
    <CreateButton />
  </TopToolbar>
);

const exporter: Exporter<Project> = async (
  records,
  fetchRelatedRecords,
) => {
  const clients = await fetchRelatedRecords<Client>(
    records,
    "client_id",
    "clients",
  );
  const projects = records.map((project) => ({
    nome: project.name,
    cliente: clients[project.client_id]?.name ?? "",
    categoria: project.category,
    programma_tv: project.tv_show ?? "",
    stato: project.status,
    data_inizio: project.start_date ?? "",
    data_fine: project.end_date ?? "",
    budget: project.budget ?? "",
    note: project.notes ?? "",
  }));
  return jsonExport(projects, {}, (_err: any, csv: string) => {
    downloadCSV(csv, "progetti");
  });
};
