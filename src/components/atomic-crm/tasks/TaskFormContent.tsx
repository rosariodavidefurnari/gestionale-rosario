import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { DateInput } from "@/components/admin/date-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";
import { required } from "ra-core";

import { useConfigurationContext } from "../root/ConfigurationContext";

export const TaskFormContent = ({
  selectClient,
}: {
  selectClient?: boolean;
}) => {
  const { taskTypes } = useConfigurationContext();
  return (
    <div className="flex flex-col gap-4">
      <TextInput
        autoFocus
        source="text"
        label="Descrizione"
        validate={required()}
        multiline
        className="m-0"
        helperText={false}
      />
      {selectClient && (
        <ReferenceInput source="client_id" reference="clients">
          <AutocompleteInput
            label="Cliente"
            optionText="name"
            helperText={false}
          />
        </ReferenceInput>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateInput
          source="due_date"
          label="Scadenza"
          helperText={false}
          validate={required()}
        />
        <SelectInput
          source="type"
          label="Tipo"
          validate={required()}
          choices={taskTypes}
          optionText="label"
          optionValue="value"
          helperText={false}
        />
      </div>
    </div>
  );
};
