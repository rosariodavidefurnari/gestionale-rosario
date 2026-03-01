import { CreateBase, Form } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

import { ExpenseInputs } from "./ExpenseInputs";
import { FormToolbar } from "../layout/FormToolbar";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { MobileBackButton } from "../misc/MobileBackButton";

export const ExpenseCreate = () => {
  const { operationalConfig } = useConfigurationContext();
  const isMobile = useIsMobile();

  return (
    <CreateBase redirect="show">
      <div className="mt-4 flex px-4 md:px-0">
        <div className="flex-1">
          <Form
            defaultValues={{
              km_distance: 0,
              km_rate: operationalConfig.defaultKmRate,
              amount: 0,
              markup_percent: 0,
            }}
          >
            {isMobile && (
              <div className="mb-3">
                <MobileBackButton />
              </div>
            )}
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
