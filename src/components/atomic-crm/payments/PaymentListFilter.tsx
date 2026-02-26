import { useListFilterContext } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { CircleDollarSign } from "lucide-react";

import { paymentStatusChoices } from "./paymentTypes";

export const PaymentListFilter = () => {
  const { filterValues, setFilters } = useListFilterContext();

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
