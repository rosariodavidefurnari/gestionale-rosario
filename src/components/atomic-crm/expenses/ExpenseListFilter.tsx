import { useListFilterContext, useGetList } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Receipt, FolderOpen } from "lucide-react";

import type { Project } from "../types";
import { expenseTypeChoices } from "./expenseTypes";

export const ExpenseListFilter = () => {
  const { filterValues, setFilters } = useListFilterContext();
  const { data: projects } = useGetList<Project>("projects", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "name", order: "ASC" },
  });

  return (
    <div className="shrink-0 w-56 order-last hidden md:block">
      <div className="flex flex-col gap-6">
        <FilterSection
          icon={<Receipt className="size-4" />}
          label="Tipo spesa"
        >
          {expenseTypeChoices.map((type) => (
            <FilterBadge
              key={type.id}
              label={type.name}
              isActive={filterValues["expense_type@eq"] === type.id}
              onToggle={() => {
                if (filterValues["expense_type@eq"] === type.id) {
                  const { "expense_type@eq": _, ...rest } = filterValues;
                  setFilters(rest);
                } else {
                  setFilters({
                    ...filterValues,
                    "expense_type@eq": type.id,
                  });
                }
              }}
            />
          ))}
        </FilterSection>

        {projects && projects.length > 0 && (
          <FilterSection
            icon={<FolderOpen className="size-4" />}
            label="Progetto"
          >
            {projects.map((project) => (
              <FilterBadge
                key={String(project.id)}
                label={project.name}
                isActive={filterValues["project_id@eq"] === String(project.id)}
                onToggle={() => {
                  if (filterValues["project_id@eq"] === String(project.id)) {
                    const { "project_id@eq": _, ...rest } = filterValues;
                    setFilters(rest);
                  } else {
                    setFilters({
                      ...filterValues,
                      "project_id@eq": String(project.id),
                    });
                  }
                }}
              />
            ))}
          </FilterSection>
        )}
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
