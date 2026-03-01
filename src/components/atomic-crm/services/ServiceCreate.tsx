import { CreateBase, Form } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

import { ServiceInputs } from "./ServiceInputs";
import { FormToolbar } from "../layout/FormToolbar";
import { MobileBackButton } from "../misc/MobileBackButton";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const ServiceCreate = () => {
  const { operationalConfig } = useConfigurationContext();
  const isMobile = useIsMobile();

  return (
    <CreateBase redirect="show">
      <div className="mt-4 flex px-4 md:px-0">
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
            {isMobile && (
              <div className="mb-3">
                <MobileBackButton />
              </div>
            )}
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
