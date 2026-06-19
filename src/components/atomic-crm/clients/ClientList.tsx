import { useCallback } from "react";
import { useListContext, useDataProvider, type Exporter } from "ra-core";
import { downloadCSVItalian } from "@/lib/downloadCsvItalian";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SortButton } from "@/components/admin/sort-button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";

import type { Client, ClientCommercialPosition } from "../types";
import type { CrmDataProvider } from "../providers/supabase/dataProvider";
import { getClientDistinctBillingName } from "./clientBilling";
import { ClientListContent } from "./ClientListContent";
import { ClientListFilter, ClientMobileFilter } from "./ClientListFilter";
import { TopToolbar } from "../layout/TopToolbar";
import { MobilePageTitle } from "../layout/MobilePageTitle";
import { CLIENT_COLUMNS, filterExportRow } from "../misc/columnDefinitions";
import { ColumnVisibilityButton } from "../misc/ColumnVisibilityButton";

export const ClientList = () => {
  const { visibleKeys, columns, toggleColumn } = useColumnVisibility(
    "clients",
    CLIENT_COLUMNS,
  );
  const dataProvider = useDataProvider<CrmDataProvider>();

  const exporter: Exporter<Client> = useCallback(
    async (records) => {
      // Outstanding balance per client from the canonical view (same source as
      // the list column / ClientShow). Full-view fetch (no @in string), Map by
      // String(client_id). Included only when the "Da saldare" column is
      // visible (filterExportRow keys off visible exportKeys).
      const { data: positions } =
        await dataProvider.getList<ClientCommercialPosition>(
          "client_commercial_position",
          {
            pagination: { page: 1, perPage: 1000 },
            sort: { field: "client_name", order: "ASC" },
            filter: {},
          },
        );
      const balanceByClient = new Map(
        positions.map((p) => [String(p.client_id), Number(p.balance_due)]),
      );
      const rows = records.map((client) =>
        filterExportRow(
          {
            nome: client.name,
            denominazione_fatturazione:
              getClientDistinctBillingName(client) ?? "",
            tipo: client.client_type,
            telefono: client.phone ?? "",
            email: client.email ?? "",
            indirizzo_operativo: client.address ?? "",
            partita_iva: client.vat_number ?? "",
            codice_fiscale: client.fiscal_code ?? "",
            via_fatturazione: client.billing_address_street ?? "",
            numero_civico_fatturazione: client.billing_address_number ?? "",
            cap_fatturazione: client.billing_postal_code ?? "",
            comune_fatturazione: client.billing_city ?? "",
            provincia_fatturazione: client.billing_province ?? "",
            nazione_fatturazione: client.billing_country ?? "",
            codice_destinatario: client.billing_sdi_code ?? "",
            pec: client.billing_pec ?? "",
            fonte: client.source ?? "",
            da_saldare: balanceByClient.get(String(client.id)) ?? 0,
            note: client.notes ?? "",
          },
          visibleKeys,
          columns,
        ),
      );
      downloadCSVItalian(rows, "clienti");
    },
    [visibleKeys, columns, dataProvider],
  );

  return (
    <List
      title={false}
      actions={
        <ClientListActions
          exporter={exporter}
          columns={columns}
          visibleKeys={visibleKeys}
          toggleColumn={toggleColumn}
        />
      }
      perPage={25}
      sort={{ field: "name", order: "ASC" }}
      exporter={exporter}
    >
      <ClientListLayout />
    </List>
  );
};

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
    <>
      <MobilePageTitle title="Clienti" />
      <div className="mt-4 flex flex-col md:flex-row md:gap-8">
        <ClientListFilter />
        <div className="w-full flex flex-col gap-4">
          <ClientListContent />
        </div>
      </div>
    </>
  );
};

const ClientListActions = ({
  exporter,
  columns,
  visibleKeys,
  toggleColumn,
}: {
  exporter: Exporter<Client>;
  columns: typeof CLIENT_COLUMNS;
  visibleKeys: string[];
  toggleColumn: (key: string) => void;
}) => {
  const isMobile = useIsMobile();
  return (
    <TopToolbar className={isMobile ? "justify-center" : undefined}>
      {isMobile && <ClientMobileFilter />}
      <SortButton fields={["name", "created_at"]} />
      <ColumnVisibilityButton
        columns={columns}
        visibleKeys={visibleKeys}
        toggleColumn={toggleColumn}
      />
      <ExportButton exporter={exporter} />
      <CreateButton />
    </TopToolbar>
  );
};
