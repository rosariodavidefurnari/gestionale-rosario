import { ShowBase, useShowContext, useGetOne } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditButton } from "@/components/admin/edit-button";
import { DeleteButton } from "@/components/admin/delete-button";
import { Calendar, Wallet, User } from "lucide-react";
import { Link } from "react-router";

import type { Project } from "../types";
import { ProjectCategoryBadge, ProjectStatusBadge } from "./ProjectListContent";
import { projectTvShowLabels } from "./projectTypes";

export const ProjectShow = () => (
  <ShowBase>
    <ProjectShowContent />
  </ShowBase>
);

const ProjectShowContent = () => {
  const { record, isPending } = useShowContext<Project>();
  if (isPending || !record) return null;

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        <Card>
          <CardContent>
            <ProjectHeader record={record} />
            <Separator className="my-4" />
            <ProjectDetails record={record} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ProjectHeader = ({ record }: { record: Project }) => {
  const { data: client } = useGetOne("clients", { id: record.client_id });

  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-2xl font-bold">{record.name}</h2>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {client && (
            <Link
              to={`/clients/${record.client_id}/show`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <User className="size-3" />
              {client.name}
            </Link>
          )}
          <ProjectCategoryBadge category={record.category} />
          {record.tv_show && (
            <span className="text-sm text-muted-foreground">
              {projectTvShowLabels[record.tv_show]}
            </span>
          )}
          <ProjectStatusBadge status={record.status} />
        </div>
      </div>
      <div className="flex gap-2">
        <EditButton />
        <DeleteButton redirect="list" />
      </div>
    </div>
  );
};

const ProjectDetails = ({ record }: { record: Project }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-3">
      <h6 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Date e budget
      </h6>
      {record.start_date && (
        <InfoRow
          icon={<Calendar className="size-4" />}
          label="Inizio"
          value={new Date(record.start_date).toLocaleDateString("it-IT")}
        />
      )}
      {record.end_date && (
        <InfoRow
          icon={<Calendar className="size-4" />}
          label="Fine prevista"
          value={new Date(record.end_date).toLocaleDateString("it-IT")}
        />
      )}
      {record.budget != null && record.budget > 0 && (
        <InfoRow
          icon={<Wallet className="size-4" />}
          label="Budget"
          value={`EUR ${record.budget.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`}
        />
      )}
    </div>
    {record.notes && (
      <div className="space-y-3">
        <h6 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Note
        </h6>
        <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
      </div>
    )}
  </div>
);

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-muted-foreground">{icon}</span>
    <span className="text-muted-foreground font-medium">{label}:</span>
    <span>{value}</span>
  </div>
);
