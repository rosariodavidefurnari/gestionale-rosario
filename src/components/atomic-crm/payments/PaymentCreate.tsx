import { CreateBase, Form } from "ra-core";
import { useMemo } from "react";
import { useLocation } from "react-router";
import { Card, CardContent } from "@/components/ui/card";

import { PaymentInputs } from "./PaymentInputs";
import { getPaymentCreateDefaultsFromSearch } from "./paymentLinking";
import { FormToolbar } from "../layout/FormToolbar";

export const PaymentCreate = () => {
  const location = useLocation();
  const defaultValues = useMemo(
    () => getPaymentCreateDefaultsFromSearch(location.search),
    [location.search],
  );

  return (
    <CreateBase redirect="show">
      <div className="mt-2 flex">
        <div className="flex-1">
          <Form defaultValues={defaultValues}>
            <Card>
              <CardContent>
                <PaymentInputs />
                <FormToolbar />
              </CardContent>
            </Card>
          </Form>
        </div>
      </div>
    </CreateBase>
  );
};
