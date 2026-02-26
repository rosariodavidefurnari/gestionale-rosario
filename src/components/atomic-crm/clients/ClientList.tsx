import jsonExport from "jsonexport/dist";
import { downloadCSV, useListContext, type Exporter } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SortButton } from "@/components/admin/sort-button";

import type { Client } from "../types";
import { ClientListContent } from "./ClientListContent";
import { ClientListFilter } from "./ClientListFilter";
import { TopToolbar } from "../layout/TopToolbar";

export const ClientList = () => (
  <List
    title={false}
    actions={<ClientListActions />}
    perPage={25}
    sort={{ field: "name", order: "ASC" }}
    exporter={exporter}
  >
    <ClientListLayout />
  </List>
);

const ClientListLayout = () => {
  const { data, isPending, filterValues } = useListContext();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;
  if (!data?.length && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground mb-4">Nessun cliente</p>
        <CreateButton />
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-8">
      <ClientListFilter />
      <div className="w-full flex flex-col gap-4">
        <ClientListContent />
      </div>
    </div>
  );
};

const ClientListActions = () => (
  <TopToolbar>
    <SortButton fields={["name", "created_at"]} />
    <ExportButton exporter={exporter} />
    <CreateButton />
  </TopToolbar>
);

const exporter: Exporter<Client> = async (records) => {
  const clients = records.map((client) => ({
    nome: client.name,
    tipo: client.client_type,
    telefono: client.phone ?? "",
    email: client.email ?? "",
    indirizzo: client.address ?? "",
    partita_iva: client.tax_id ?? "",
    fonte: client.source ?? "",
    note: client.notes ?? "",
  }));
  return jsonExport(clients, {}, (_err: any, csv: string) => {
    downloadCSV(csv, "clienti");
  });
};
