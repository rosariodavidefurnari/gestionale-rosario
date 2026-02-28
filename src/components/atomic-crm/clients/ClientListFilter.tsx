import { useListFilterContext } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Building2, Megaphone } from "lucide-react";

import { clientTypeChoices, clientSourceChoices } from "./clientTypes";

export const ClientListFilter = () => {
  const { filterValues, setFilters } = useListFilterContext();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setFilters({ ...filterValues, "name@ilike": `%${value}%` });
    } else {
      const { "name@ilike": _, ...rest } = filterValues;
      setFilters(rest);
    }
  };

  return (
    <div className="shrink-0 w-56 order-last hidden md:block">
      <div className="flex flex-col gap-6">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Cerca nome..."
            className="pl-8"
            value={
              (filterValues["name@ilike"] as string)?.replace(/%/g, "") ?? ""
            }
            onChange={handleSearchChange}
          />
        </div>

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
