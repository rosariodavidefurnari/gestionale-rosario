import { useState } from "react";
import { useListFilterContext, useGetList } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  FileText,
  User,
  Calendar,
  Hash,
  Filter,
} from "lucide-react";

import type { Client, FinancialDocumentSummary } from "../types";
import {
  FilterSection,
  FilterBadge,
  FilterPopover,
} from "../filters/FilterHelpers";

const RESOURCE = "financial_documents_summary";

const directionChoices = [
  { id: "outbound", name: "Emesse" },
  { id: "inbound", name: "Ricevute" },
];

const typeChoices = [
  { id: "invoice", name: "Fattura" },
  { id: "credit_note", name: "Nota di credito" },
];

/* ---- Desktop sidebar ---- */
export const FinancialDocumentListFilter = () => (
  <div className="shrink-0 w-56 order-last hidden md:block">
    <FinancialDocumentFilterContent />
  </div>
);

/* ---- Mobile Sheet filter ---- */
export const FinancialDocumentMobileFilter = () => {
  const { filterValues, setFilters } = useListFilterContext();
  const activeCount = Object.keys(filterValues || {}).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label="Filtri"
        >
          <Filter className="size-5" />
          {activeCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-dvh p-4 flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Filtri</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto flex flex-col gap-6 pb-4">
          <FinancialDocumentFilterContent />
        </div>
        <SheetFooter className="relative">
          <div className="absolute -top-12 left-0 right-0 h-8 bg-linear-to-t from-background to-transparent pointer-events-none" />
          <div className="flex w-full gap-4">
            <SheetClose asChild>
              <Button
                onClick={() => setFilters({}, [])}
                type="button"
                variant="secondary"
                className="flex-1"
              >
                Cancella filtri
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button className="flex-1">Applica</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

/* ---- Derive distinct years from the dataset ---- */
const useDocumentYears = (): string[] => {
  const { data } = useGetList<FinancialDocumentSummary>(RESOURCE, {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "issue_date", order: "DESC" },
  });
  if (!data) return [];
  const years = new Set<string>();
  for (const doc of data) {
    if (doc.issue_date) years.add(doc.issue_date.slice(0, 4));
  }
  return [...years].sort((a, b) => b.localeCompare(a));
};

/* ---- Shared filter content ---- */
const FinancialDocumentFilterContent = () => {
  const { filterValues, setFilters } = useListFilterContext();
  const [numberQuery, setNumberQuery] = useState(
    () =>
      (filterValues["document_number@ilike"] as string | undefined)?.replace(
        /%/g,
        "",
      ) ?? "",
  );

  const years = useDocumentYears();

  const { data: clients } = useGetList<Client>("clients", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "name", order: "ASC" },
  });

  const toggleDirection = (id: string) => {
    if (filterValues["direction@eq"] === id) {
      const { "direction@eq": _, ...rest } = filterValues;
      setFilters(rest);
    } else {
      setFilters({ ...filterValues, "direction@eq": id });
    }
  };

  const typePattern = (id: string) =>
    id === "invoice" ? "%_invoice" : "%_credit_note";

  const toggleType = (id: string) => {
    // document_type values share the "_invoice" / "_credit_note" suffix
    // (customer_/supplier_). A trailing @ilike pattern matches both directions.
    const pattern = typePattern(id);
    if (filterValues["document_type@ilike"] === pattern) {
      const { "document_type@ilike": _, ...rest } = filterValues;
      setFilters(rest);
    } else {
      setFilters({ ...filterValues, "document_type@ilike": pattern });
    }
  };

  const isTypeActive = (id: string) =>
    filterValues["document_type@ilike"] === typePattern(id);

  const toggleYear = (year: string) => {
    const gte = `${year}-01-01`;
    const lte = `${year}-12-31`;
    if (
      filterValues["issue_date@gte"] === gte &&
      filterValues["issue_date@lte"] === lte
    ) {
      const {
        "issue_date@gte": _g,
        "issue_date@lte": _l,
        ...rest
      } = filterValues;
      setFilters(rest);
    } else {
      setFilters({
        ...filterValues,
        "issue_date@gte": gte,
        "issue_date@lte": lte,
      });
    }
  };

  const isYearActive = (year: string) =>
    filterValues["issue_date@gte"] === `${year}-01-01` &&
    filterValues["issue_date@lte"] === `${year}-12-31`;

  const handleNumberChange = (value: string) => {
    setNumberQuery(value);
    if (!value.trim()) {
      const { "document_number@ilike": _, ...rest } = filterValues;
      setFilters(rest);
    } else {
      setFilters({
        ...filterValues,
        "document_number@ilike": `%${value.trim()}%`,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FilterSection
        icon={<ArrowLeftRight className="size-4" />}
        label="Direzione"
      >
        {directionChoices.map((d) => (
          <FilterBadge
            key={d.id}
            label={d.name}
            isActive={filterValues["direction@eq"] === d.id}
            onToggle={() => toggleDirection(d.id)}
          />
        ))}
      </FilterSection>

      <FilterSection icon={<FileText className="size-4" />} label="Tipo">
        {typeChoices.map((t) => (
          <FilterBadge
            key={t.id}
            label={t.name}
            isActive={isTypeActive(t.id)}
            onToggle={() => toggleType(t.id)}
          />
        ))}
      </FilterSection>

      {years.length > 0 && (
        <FilterSection icon={<Calendar className="size-4" />} label="Anno">
          {years.map((year) => (
            <FilterBadge
              key={year}
              label={year}
              isActive={isYearActive(year)}
              onToggle={() => toggleYear(year)}
            />
          ))}
        </FilterSection>
      )}

      {clients && clients.length > 0 && (
        <FilterSection icon={<User className="size-4" />} label="Controparte">
          <FilterPopover
            items={clients}
            filterKey="client_id@eq"
            filterValues={filterValues}
            setFilters={setFilters}
            placeholder="Cerca cliente..."
            emptyLabel="Nessun cliente"
            ariaLabel="Filtra per cliente"
          />
        </FilterSection>
      )}

      <FilterSection
        icon={<Hash className="size-4" />}
        label="Numero documento"
      >
        <div className="w-full">
          <Input
            type="text"
            className="h-9 text-sm"
            placeholder="Cerca numero..."
            value={numberQuery}
            onChange={(e) => handleNumberChange(e.target.value)}
          />
        </div>
      </FilterSection>
    </div>
  );
};
