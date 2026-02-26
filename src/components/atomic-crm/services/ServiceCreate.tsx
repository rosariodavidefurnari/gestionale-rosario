import { CreateBase, Form } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import { ServiceInputs } from "./ServiceInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const ServiceCreate = () => (
  <CreateBase redirect="show">
    <div className="mt-2 flex">
      <div className="flex-1">
        <Form
          defaultValues={{
            fee_shooting: 0,
            fee_editing: 0,
            fee_other: 0,
            discount: 0,
            km_distance: 0,
            km_rate: 0.19,
          }}
        >
          <Card>
            <CardContent>
              <ServiceInputs />
              <FormToolbar />
            </CardContent>
          </Card>
        </Form>
      </div>
    </div>
  </CreateBase>
);
