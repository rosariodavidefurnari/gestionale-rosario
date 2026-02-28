import { CreateBase, Form } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import { ProjectInputs } from "./ProjectInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const ProjectCreate = () => (
  <CreateBase redirect="show">
    <div className="mt-2 flex">
      <div className="flex-1">
        <Form defaultValues={{ all_day: true }}>
          <Card>
            <CardContent>
              <ProjectInputs />
              <FormToolbar />
            </CardContent>
          </Card>
        </Form>
      </div>
    </div>
  </CreateBase>
);
