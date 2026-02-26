import { EditBase, Form, useEditContext } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import type { Service } from "../types";
import { ServiceInputs } from "./ServiceInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const ServiceEdit = () => (
  <EditBase redirect="show">
    <ServiceEditContent />
  </EditBase>
);

const ServiceEditContent = () => {
  const { isPending, record } = useEditContext<Service>();
  if (isPending || !record) return null;
  return (
    <div className="mt-2 flex gap-8">
      <Form className="flex flex-1 flex-col gap-4">
        <Card>
          <CardContent>
            <ServiceInputs />
            <FormToolbar />
          </CardContent>
        </Card>
      </Form>
    </div>
  );
};
