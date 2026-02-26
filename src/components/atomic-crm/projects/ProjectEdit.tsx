import { EditBase, Form, useEditContext } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import type { Project } from "../types";
import { ProjectInputs } from "./ProjectInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const ProjectEdit = () => (
  <EditBase redirect="show">
    <ProjectEditContent />
  </EditBase>
);

const ProjectEditContent = () => {
  const { isPending, record } = useEditContext<Project>();
  if (isPending || !record) return null;
  return (
    <div className="mt-2 flex gap-8">
      <Form className="flex flex-1 flex-col gap-4">
        <Card>
          <CardContent>
            <ProjectInputs />
            <FormToolbar />
          </CardContent>
        </Card>
      </Form>
    </div>
  );
};
