import { EditBase, Form, useEditContext } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import type { Expense } from "../types";
import { ExpenseInputs } from "./ExpenseInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const ExpenseEdit = () => (
  <EditBase redirect="show">
    <ExpenseEditContent />
  </EditBase>
);

const ExpenseEditContent = () => {
  const { isPending, record } = useEditContext<Expense>();
  if (isPending || !record) return null;
  return (
    <div className="mt-2 flex gap-8">
      <Form className="flex flex-1 flex-col gap-4">
        <Card>
          <CardContent>
            <ExpenseInputs />
            <FormToolbar />
          </CardContent>
        </Card>
      </Form>
    </div>
  );
};
