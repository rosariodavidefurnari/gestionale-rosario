import { useListFilterContext, useGetList } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { CircleDollarSign, FolderOpen } from "lucide-react";

import type { Project } from "../types";
import { paymentStatusChoices } from "./paymentTypes";

export const PaymentListFilter = () => {
  const { filterValues, setFilters } = useListFilterContext();
  const { data: projects } = useGetList<Project>("projects", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "name", order: "ASC" },
  });

  return (
    <div className="shrink-0 w-56 order-last hidden md:block">
      <div className="flex flex-col gap-6">
        <FilterSection
          icon={<CircleDollarSign className="size-4" />}
          label="Stato"
        >
          {paymentStatusChoices.map((status) => (
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
