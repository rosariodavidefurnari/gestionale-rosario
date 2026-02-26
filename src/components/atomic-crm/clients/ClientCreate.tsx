import { CreateBase, Form } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import { ClientInputs } from "./ClientInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const ClientCreate = () => (
  <CreateBase redirect="show">
    <div className="mt-2 flex">
      <div className="flex-1">
        <Form>
          <Card>
            <CardContent>
              <ClientInputs />
              <FormToolbar />
            </CardContent>
          </Card>
        </Form>
      </div>
    </div>
  </CreateBase>
);
