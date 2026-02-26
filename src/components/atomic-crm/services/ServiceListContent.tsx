import { useListContext, useCreatePath, useGetOne } from "ra-core";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Service } from "../types";
import { serviceTypeLabels } from "./serviceTypes";

const eur = (n: number) =>
  n ? n.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : "--";

export const ServiceListContent = () => {
  const { data, isPending } = useListContext<Service>();
  const createPath = useCreatePath();

  if (isPending || !data) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Data</TableHead>
          <TableHead>Progetto</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right hidden md:table-cell">Riprese</TableHead>
          <TableHead className="text-right hidden md:table-cell">Montaggio</TableHead>
          <TableHead className="text-right hidden lg:table-cell">Altro</TableHead>
          <TableHead className="text-right">Totale</TableHead>
          <TableHead className="text-right hidden lg:table-cell">Km</TableHead>
          <TableHead className="hidden xl:table-cell">Localit&agrave;</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((service) => (
          <ServiceRow
            key={service.id}
            service={service}
            link={createPath({
              resource: "services",
              type: "show",
              id: service.id,
            })}
          />
        ))}
      </TableBody>
    </Table>
  );
};

const ServiceRow = ({
  service,
  link,
}: {
  service: Service;
  link: string;
}) => {
  const { data: project } = useGetOne("projects", { id: service.project_id });
  const total =
    service.fee_shooting + service.fee_editing + service.fee_other - service.discount;

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell className="text-sm">
        <Link to={link} className="text-primary hover:underline">
          {new Date(service.service_date).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
          })}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {project?.name ?? ""}
      </TableCell>
      <TableCell className="text-sm">
        {serviceTypeLabels[service.service_type] ?? service.service_type}
      </TableCell>
      <TableCell className="text-right text-sm hidden md:table-cell">
        {eur(service.fee_shooting)}
      </TableCell>
      <TableCell className="text-right text-sm hidden md:table-cell">
        {eur(service.fee_editing)}
      </TableCell>
      <TableCell className="text-right text-sm hidden lg:table-cell">
        {eur(service.fee_other)}
      </TableCell>
      <TableCell className="text-right text-sm font-medium">
        {eur(total)}
      </TableCell>
      <TableCell className="text-right text-sm hidden lg:table-cell">
        {service.km_distance || "--"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">
        {service.location ?? ""}
      </TableCell>
    </TableRow>
  );
};
