import { useState } from "react";
import { useListFilterContext, useGetList } from "ra-core";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  CircleDollarSign,
  FolderOpen,
  User,
  Calendar,
  ChevronsUpDown,
  X,
} from "lucide-react";

import type { Client, Project } from "../types";
import { paymentStatusChoices } from "./paymentTypes";

export const PaymentListFilter = () => {
  const { filterValues, setFilters } = useListFilterContext();
  const [clientOpen, setClientOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const { data: clients } = useGetList<Client>("clients", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "name", order: "ASC" },
  });

  const { data: projects } = useGetList<Project>("projects", {
    pagination: { page: 1, perPage: 200 },
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

        {projects && projects.length > 0 && (
          <FilterSection
            icon={<FolderOpen className="size-4" />}
            label="Progetto"
          >
            <div className="w-full">
              <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Filtra per progetto"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <span className="truncate">
                      {filterValues["project_id@eq"]
                        ? projects.find(
                            (p) =>
                              String(p.id) === filterValues["project_id@eq"],
                          )?.name ?? "Tutti"
                        : "Tutti"}
                    </span>
                    {filterValues["project_id@eq"] ? (
                      <X
                        className="size-3.5 shrink-0 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          const { "project_id@eq": _, ...rest } = filterValues;
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
                    <CommandInput placeholder="Cerca progetto..." />
                    <CommandList>
                      <CommandEmpty>Nessun progetto</CommandEmpty>
                      <CommandGroup>
                        {projects.map((p) => (
                          <CommandItem
                            key={String(p.id)}
                            value={p.name}
                            onSelect={() => {
                              setFilters({
                                ...filterValues,
                                "project_id@eq": String(p.id),
                              });
                              setProjectOpen(false);
                            }}
                          >
                            {p.name}
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
          icon={<Calendar className="size-4" />}
          label="Periodo"
        >
          <div className="flex flex-col gap-2 w-full">
            <div>
              <label className="text-xs text-muted-foreground">Da</label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={(filterValues["payment_date@gte"] as string) ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    setFilters({
                      ...filterValues,
                      "payment_date@gte": value,
                    });
                  } else {
                    const { "payment_date@gte": _, ...rest } = filterValues;
                    setFilters(rest);
                  }
                }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">A</label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={(filterValues["payment_date@lte"] as string) ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    setFilters({
                      ...filterValues,
                      "payment_date@lte": value,
                    });
                  } else {
                    const { "payment_date@lte": _, ...rest } = filterValues;
                    setFilters(rest);
                  }
                }}
              />
            </div>
          </div>
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
