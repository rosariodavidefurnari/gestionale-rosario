import { useMutation } from "@tanstack/react-query";
import { useDataProvider, useNotify, useRedirect } from "ra-core";
import type { SubmitHandler } from "react-hook-form";
import { SimpleForm } from "@/components/admin/simple-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { CrmDataProvider } from "../providers/types";
import type { SalesFormData } from "../types";
import { SalesInputs } from "./SalesInputs";

export function SalesCreate() {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const redirect = useRedirect();

  const { mutate } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: SalesFormData) => {
      return dataProvider.salesCreate(data);
    },
    onSuccess: () => {
      notify(
        "Utente creato. Riceverà presto un'email per impostare la password.",
      );
      redirect("/sales");
    },
    onError: (error) => {
      notify(
        error.message ||
          "Si è verificato un errore durante la creazione dell'utente.",
        {
          type: "error",
        },
      );
    },
  });
  const onSubmit: SubmitHandler<SalesFormData> = async (data) => {
    mutate(data);
  };

  return (
    <div className="max-w-lg w-full mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Crea un nuovo utente</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleForm onSubmit={onSubmit as SubmitHandler<any>}>
            <SalesInputs />
          </SimpleForm>
        </CardContent>
      </Card>
    </div>
  );
}
