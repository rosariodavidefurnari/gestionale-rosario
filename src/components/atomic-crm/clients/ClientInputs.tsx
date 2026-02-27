import { required, useDataProvider, useRecordContext } from "ra-core";
import { Separator } from "@/components/ui/separator";
import { TextInput } from "@/components/admin/text-input";
import { SelectInput } from "@/components/admin/select-input";

import type { Client } from "../types";
import { clientTypeChoices, clientSourceChoices } from "./clientTypes";

export const ClientInputs = () => {
  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="flex gap-6 flex-col md:flex-row">
        <div className="flex flex-col gap-10 flex-1">
          <ClientIdentityInputs />
          <ClientContactInputs />
        </div>
        <Separator
          orientation="vertical"
          className="flex-shrink-0 hidden md:block"
        />
        <div className="flex flex-col gap-10 flex-1">
          <ClientDetailInputs />
        </div>
      </div>
    </div>
  );
};

const ClientIdentityInputs = () => {
  const dataProvider = useDataProvider();
  const record = useRecordContext<Client>();

  const validateUniqueName = async (name: string) => {
    if (!name?.trim()) return undefined;
    const { data } = await dataProvider.getList<Client>("clients", {
      filter: { "name@eq": name.trim() },
      pagination: { page: 1, perPage: 1 },
      sort: { field: "id", order: "ASC" },
    });
    if (data?.length > 0 && data[0].id !== record?.id) {
      return "Esiste già un cliente con questo nome";
    }
    return undefined;
  };

  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Anagrafica</h6>
      <TextInput
        source="name"
        label="Nome / Ragione sociale"
        validate={[required(), validateUniqueName]}
        helperText={false}
      />
      <SelectInput
        source="client_type"
        label="Tipo cliente"
        choices={clientTypeChoices}
        validate={required()}
        helperText={false}
      />
    </div>
  );
};

const ClientContactInputs = () => (
  <div className="flex flex-col gap-4">
    <h6 className="text-lg font-semibold">Contatti</h6>
    <TextInput source="phone" label="Telefono" helperText={false} />
    <TextInput source="email" label="Email" helperText={false} />
    <TextInput source="address" label="Indirizzo" helperText={false} />
  </div>
);

const ClientDetailInputs = () => (
  <div className="flex flex-col gap-4">
    <h6 className="text-lg font-semibold">Dettagli</h6>
    <TextInput
      source="tax_id"
      label="Partita IVA / Codice Fiscale"
      helperText={false}
    />
    <SelectInput
      source="source"
      label="Fonte acquisizione"
      choices={clientSourceChoices}
      helperText={false}
    />
    <TextInput
      source="notes"
      label="Note generali"
      multiline
      helperText={false}
    />
  </div>
);
