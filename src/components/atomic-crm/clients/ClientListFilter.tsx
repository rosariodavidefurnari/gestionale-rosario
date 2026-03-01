import { useListFilterContext } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, FileBadge2, MapPin, Megaphone, Search } from "lucide-react";

import { clientTypeChoices, clientSourceChoices } from "./clientTypes";
import {
  getClientTextFilterValue,
  patchClientTextFilter,
} from "./clientListFilters";

export const ClientListFilter = () => {
  const { filterValues, setFilters } = useListFilterContext();

  const handleTextFilterChange =
    (
      field:
        | "name"
        | "billing_name"
        | "vat_number"
        | "fiscal_code"
        | "billing_city"
        | "billing_sdi_code"
        | "billing_pec",
    ) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters(
        patchClientTextFilter({
          filterValues,
          field,
          value: e.target.value,
        }),
      );
    };

  return (
    <div className="shrink-0 w-56 order-last hidden md:block">
      <div className="flex flex-col gap-6">
        <FilterSection icon={<Search className="size-4" />} label="Ricerca">
          <div className="space-y-2">
            <Input
              placeholder="Nome / ragione sociale"
              value={getClientTextFilterValue(filterValues, "name")}
              onChange={handleTextFilterChange("name")}
            />
            <Input
              placeholder="Denominazione fatturazione"
              value={getClientTextFilterValue(filterValues, "billing_name")}
              onChange={handleTextFilterChange("billing_name")}
            />
          </div>
        </FilterSection>

        <FilterSection
          icon={<FileBadge2 className="size-4" />}
          label="Identificativi fiscali"
        >
          <div className="space-y-2">
            <Input
              placeholder="Partita IVA"
              value={getClientTextFilterValue(filterValues, "vat_number")}
              onChange={handleTextFilterChange("vat_number")}
            />
            <Input
              placeholder="Codice fiscale"
              value={getClientTextFilterValue(filterValues, "fiscal_code")}
              onChange={handleTextFilterChange("fiscal_code")}
            />
            <Input
              placeholder="Codice destinatario"
              value={getClientTextFilterValue(filterValues, "billing_sdi_code")}
              onChange={handleTextFilterChange("billing_sdi_code")}
            />
            <Input
              placeholder="PEC"
              value={getClientTextFilterValue(filterValues, "billing_pec")}
              onChange={handleTextFilterChange("billing_pec")}
            />
          </div>
        </FilterSection>

        <FilterSection icon={<MapPin className="size-4" />} label="Fatturazione">
          <Input
            placeholder="Comune fiscale"
            value={getClientTextFilterValue(filterValues, "billing_city")}
            onChange={handleTextFilterChange("billing_city")}
          />
        </FilterSection>

        <FilterSection
          icon={<Building2 className="size-4" />}
          label="Tipo cliente"
        >
          {clientTypeChoices.map((type) => (
            <FilterBadge
              key={type.id}
              label={type.name}
              isActive={filterValues["client_type@eq"] === type.id}
              onToggle={() => {
                if (filterValues["client_type@eq"] === type.id) {
                  const { "client_type@eq": _, ...rest } = filterValues;
                  setFilters(rest);
                } else {
                  setFilters({
                    ...filterValues,
                    "client_type@eq": type.id,
                  });
                }
              }}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Megaphone className="size-4" />} label="Fonte">
          {clientSourceChoices.map((source) => (
            <FilterBadge
              key={source.id}
              label={source.name}
              isActive={filterValues["source@eq"] === source.id}
              onToggle={() => {
                if (filterValues["source@eq"] === source.id) {
                  const { "source@eq": _, ...rest } = filterValues;
                  setFilters(rest);
                } else {
                  setFilters({ ...filterValues, "source@eq": source.id });
                }
              }}
            />
          ))}
        </FilterSection>
      </div>
    </div>
  );
};

const FilterSection = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

const FilterBadge = ({
  label,
  isActive,
  onToggle,
}: {
  label: string;
  isActive: boolean;
  onToggle: () => void;
}) => (
  <Badge
    variant={isActive ? "default" : "outline"}
    className="cursor-pointer"
    onClick={onToggle}
  >
    {label}
  </Badge>
);
