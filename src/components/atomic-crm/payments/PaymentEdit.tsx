import { EditBase, Form, useEditContext } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import type { Payment } from "../types";
import { PaymentInputs } from "./PaymentInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const PaymentEdit = () => (
  <EditBase redirect="show">
    <PaymentEditContent />
  </EditBase>
);

const PaymentEditContent = () => {
  const { isPending, record } = useEditContext<Payment>();
  if (isPending || !record) return null;
  return (
    <div className="mt-2 flex gap-8">
      <Form className="flex flex-1 flex-col gap-4">
        <Card>
          <CardContent>
            <PaymentInputs />
            <FormToolbar />
          </CardContent>
        </Card>
      </Form>
    </div>
  );
};
