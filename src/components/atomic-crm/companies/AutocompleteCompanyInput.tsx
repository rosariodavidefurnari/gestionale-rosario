import { useCreate, useGetIdentity, useNotify } from "ra-core";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import type { InputProps } from "ra-core";

export const AutocompleteCompanyInput = ({
  validate,
  label,
}: Pick<InputProps, "validate" | "label">) => {
  const [create] = useCreate();
  const { identity } = useGetIdentity();
  const notify = useNotify();
  const handleCreateCompany = async (name?: string) => {
    if (!name) return;
    try {
      const newCompany = await create(
        "companies",
        {
          data: {
            name,
            sales_id: identity?.id,
            created_at: new Date().toISOString(),
          },
        },
        { returnPromise: true },
      );
      return newCompany;
    } catch {
      notify("Errore durante la creazione dell'azienda", {
        type: "error",
      });
    }
  };

  return (
    <AutocompleteInput
      optionText="name"
      label={label}
      helperText={false}
      onCreate={handleCreateCompany}
      createItemLabel="Crea %{item}"
      createLabel="Inizia a digitare per creare una nuova azienda"
      validate={validate}
    />
  );
};
