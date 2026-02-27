import { useState } from "react";
import { useListFilterContext, useGetList } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Search,
  Folder,
  Activity,
  User,
  ChevronsUpDown,
  X,
} from "lucide-react";

import type { Client } from "../types";
import { projectCategoryChoices, projectStatusChoices } from "./projectTypes";

export const ProjectListFilter = () => {
  const { filterValues, setFilters } = useListFilterContext();
  const [clientOpen, setClientOpen] = useState(false);

  const { data: clients } = useGetList<Client>("clients", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "name", order: "ASC" },
  });

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
            placeholder="Cerca progetto..."
            className="pl-8"
            value={
              (filterValues["name@ilike"] as string)?.replace(/%/g, "") ?? ""
            }
            onChange={handleSearchChange}
          />
        </div>

        {clients && clients.length > 0 && (
          <FilterSection
            icon={<User className="size-4" />}
            label="Cliente"
          >
            <div className="w-full">
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Filtra per cliente"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <span className="truncate">
                      {filterValues["client_id@eq"]
                        ? clients.find(
                            (c) =>
                              String(c.id) === filterValues["client_id@eq"],
                          )?.name ?? "Tutti"
                        : "Tutti"}
                    </span>
                    {filterValues["client_id@eq"] ? (
                      <X
                        className="size-3.5 shrink-0 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          const { "client_id@eq": _, ...rest } = filterValues;
                          setFilters(rest);
                        }}
                      />
                    ) : (
                      <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cerca cliente..." />
                    <CommandList>
                      <CommandEmpty>Nessun cliente</CommandEmpty>
                      <CommandGroup>
                        {clients.map((c) => (
                          <CommandItem
                            key={String(c.id)}
                            value={c.name}
                            onSelect={() => {
                              setFilters({
                                ...filterValues,
                                "client_id@eq": String(c.id),
                              });
                              setClientOpen(false);
                            }}
                          >
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </FilterSection>
        )}

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
