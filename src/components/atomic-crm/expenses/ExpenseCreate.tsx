import { CreateBase, Form } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import { ExpenseInputs } from "./ExpenseInputs";
import { FormToolbar } from "../layout/FormToolbar";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const ExpenseCreate = () => {
  const { operationalConfig } = useConfigurationContext();

  return (
    <CreateBase redirect="show">
      <div className="mt-2 flex">
        <div className="flex-1">
          <Form
            defaultValues={{
              km_distance: 0,
              km_rate: operationalConfig.defaultKmRate,
              amount: 0,
              markup_percent: 0,
            }}
          >
            <Card>
              <CardContent>
                <ExpenseInputs />
                <FormToolbar />
              </CardContent>
            </Card>
          </Form>
        </div>
      </div>
    </CreateBase>
  );
};
