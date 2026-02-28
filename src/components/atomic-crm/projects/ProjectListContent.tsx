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
import { Badge } from "@/components/ui/badge";

import type { Project } from "../types";
import {
  projectCategoryLabels,
  projectStatusLabels,
  projectTvShowLabels,
} from "./projectTypes";
import { formatDateRange } from "../misc/formatDateRange";

export const ProjectListContent = () => {
  const { data, isPending } = useListContext<Project>();
  const createPath = useCreatePath();

  if (isPending || !data) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome progetto</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead className="hidden md:table-cell">Stato</TableHead>
          <TableHead className="hidden lg:table-cell">Periodo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            link={createPath({
              resource: "projects",
              type: "show",
              id: project.id,
            })}
          />
        ))}
      </TableBody>
    </Table>
  );
};

const ProjectRow = ({ project, link }: { project: Project; link: string }) => {
  const { data: client } = useGetOne("clients", { id: project.client_id });

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell>
        <Link to={link} className="font-medium text-primary hover:underline">
          {project.name}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {client?.name ?? ""}
      </TableCell>
      <TableCell>
        <ProjectCategoryBadge category={project.category} />
        {project.tv_show && (
          <span className="ml-1 text-xs text-muted-foreground">
            {projectTvShowLabels[project.tv_show]}
          </span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <ProjectStatusBadge status={project.status} />
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
        {formatDateRange(project.start_date, project.end_date, project.all_day)}
      </TableCell>
    </TableRow>
  );
};

const categoryBadgeColors: Record<string, string> = {
  produzione_tv:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  spot: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  wedding: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  evento_privato:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  sviluppo_web:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export const ProjectCategoryBadge = ({ category }: { category: string }) => (
  <Badge variant="outline" className={categoryBadgeColors[category] ?? ""}>
    {projectCategoryLabels[category] ?? category}
  </Badge>
);

const statusBadgeColors: Record<string, string> = {
  in_corso: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completato: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  in_pausa:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  cancellato: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const ProjectStatusBadge = ({ status }: { status: string }) => (
  <Badge variant="outline" className={statusBadgeColors[status] ?? ""}>
    {projectStatusLabels[status] ?? status}
  </Badge>
);
