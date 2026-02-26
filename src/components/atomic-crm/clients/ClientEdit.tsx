import { EditBase, Form, useEditContext } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import type { Client } from "../types";
import { ClientInputs } from "./ClientInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const ClientEdit = () => (
  <EditBase redirect="show">
    <ClientEditContent />
  </EditBase>
);

const ClientEditContent = () => {
  const { isPending, record } = useEditContext<Client>();
  if (isPending || !record) return null;
  return (
    <div className="mt-2 flex gap-8">
      <Form className="flex flex-1 flex-col gap-4">
        <Card>
          <CardContent>
            <ClientInputs />
            <FormToolbar />
          </CardContent>
        </Card>
      </Form>
    </div>
  );
};
