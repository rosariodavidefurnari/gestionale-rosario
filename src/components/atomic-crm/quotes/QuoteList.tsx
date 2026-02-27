import jsonExport from "jsonexport/dist";
import { downloadCSV, useListContext, type Exporter } from "ra-core";
import { matchPath, useLocation } from "react-router";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { FilterButton } from "@/components/admin/filter-form";
import { List } from "@/components/admin/list";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SearchInput } from "@/components/admin/search-input";
import { SelectInput } from "@/components/admin/select-input";

import type { Client, Quote } from "../types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { TopToolbar } from "../layout/TopToolbar";
import { QuoteCreate } from "./QuoteCreate";
import { QuoteEdit } from "./QuoteEdit";
import { QuoteEmpty } from "./QuoteEmpty";
import { QuoteListContent } from "./QuoteListContent";
import { QuoteShow } from "./QuoteShow";
import { quoteStatusLabels } from "./quotesTypes";

const QuoteList = () => {
  const { quoteServiceTypes } = useConfigurationContext();

  const quoteFilters = [
    <SearchInput source="q" alwaysOn />,
    <ReferenceInput source="client_id" reference="clients">
      <AutocompleteInput label={false} placeholder="Cliente" optionText="name" />
    </ReferenceInput>,
    <SelectInput
      source="service_type"
      emptyText="Tipo servizio"
      choices={quoteServiceTypes}
      optionText="label"
      optionValue="value"
    />,
  ];

  const typeLabels: Record<string, string> = Object.fromEntries(
    quoteServiceTypes.map((t) => [t.value, t.label]),
  );

  const exporter: Exporter<Quote> = async (records, fetchRelatedRecords) => {
    const clients = await fetchRelatedRecords<Client>(
      records,
      "client_id",
      "clients",
    );
    const rows = records.map((q) => ({
      descrizione: q.description ?? "",
      cliente: clients[q.client_id]?.name ?? "",
      tipo_servizio: typeLabels[q.service_type] ?? q.service_type,
      data_evento: q.event_date ?? "",
      importo: q.amount,
      stato: quoteStatusLabels[q.status] ?? q.status,
      data_invio: q.sent_date ?? "",
      data_risposta: q.response_date ?? "",
      motivo_rifiuto: q.rejection_reason ?? "",
      note: q.notes ?? "",
    }));
    return jsonExport(rows, {}, (_err: any, csv: string) => {
      downloadCSV(csv, "preventivi");
    });
  };

  return (
    <List
      perPage={100}
      title={false}
      sort={{ field: "index", order: "DESC" }}
      filters={quoteFilters}
      actions={<QuoteActions />}
      pagination={null}
      exporter={exporter}
    >
      <QuoteLayout />
    </List>
  );
};

const QuoteLayout = () => {
  const location = useLocation();
  const matchCreate = matchPath("/quotes/create", location.pathname);
  const matchShow = matchPath("/quotes/:id/show", location.pathname);
  const matchEdit = matchPath("/quotes/:id", location.pathname);

  const { data, isPending, filterValues } = useListContext();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;
  if (!data?.length && !hasFilters && !matchCreate) return <QuoteEmpty />;

  return (
    <div className="w-full">
      <QuoteListContent />
      <QuoteCreate open={!!matchCreate} />
      <QuoteEdit
        open={!!matchEdit && !matchCreate && !matchShow}
        id={matchEdit?.params.id}
      />
      <QuoteShow open={!!matchShow} id={matchShow?.params.id} />
    </div>
  );
};

const QuoteActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
    <CreateButton label="Nuovo Preventivo" />
  </TopToolbar>
);

export default QuoteList;
