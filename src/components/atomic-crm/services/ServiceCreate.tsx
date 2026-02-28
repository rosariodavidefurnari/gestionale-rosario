import { CreateBase, Form } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import { ServiceInputs } from "./ServiceInputs";
import { FormToolbar } from "../layout/FormToolbar";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const ServiceCreate = () => {
  const { operationalConfig } = useConfigurationContext();

  return (
    <CreateBase redirect="show">
      <div className="mt-2 flex">
        <div className="flex-1">
          <Form
            defaultValues={{
              all_day: true,
              is_taxable: true,
              fee_shooting: 0,
              fee_editing: 0,
              fee_other: 0,
              discount: 0,
              km_distance: 0,
              km_rate: operationalConfig.defaultKmRate,
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
};
