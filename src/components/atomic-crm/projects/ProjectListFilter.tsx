import { useListFilterContext } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Folder, Activity } from "lucide-react";

import { projectCategoryChoices, projectStatusChoices } from "./projectTypes";

export const ProjectListFilter = () => {
  const { filterValues, setFilters } = useListFilterContext();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setFilters({ ...filterValues, q: value });
    } else {
      const { q: _, ...rest } = filterValues;
      setFilters(rest);
    }
  };

  return (
    <div className="shrink-0 w-56 order-last hidden md:block">
      <div className="flex flex-col gap-6">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Cerca progetto..."
            className="pl-8"
            value={filterValues.q ?? ""}
            onChange={handleSearchChange}
          />
        </div>

        <FilterSection
          icon={<Folder className="size-4" />}
          label="Categoria"
        >
          {projectCategoryChoices.map((cat) => (
            <FilterBadge
              key={cat.id}
              label={cat.name}
              isActive={filterValues["category@eq"] === cat.id}
              onToggle={() => {
                if (filterValues["category@eq"] === cat.id) {
                  const { "category@eq": _, ...rest } = filterValues;
                  setFilters(rest);
                } else {
                  setFilters({ ...filterValues, "category@eq": cat.id });
                }
              }}
            />
          ))}
        </FilterSection>

        <FilterSection
          icon={<Activity className="size-4" />}
          label="Stato"
        >
          {projectStatusChoices.map((status) => (
            <FilterBadge
              key={status.id}
              label={status.name}
              isActive={filterValues["status@eq"] === status.id}
              onToggle={() => {
                if (filterValues["status@eq"] === status.id) {
                  const { "status@eq": _, ...rest } = filterValues;
                  setFilters(rest);
                } else {
                  setFilters({ ...filterValues, "status@eq": status.id });
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
