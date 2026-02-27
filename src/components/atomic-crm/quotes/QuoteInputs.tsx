import { required, minValue } from "ra-core";
import { useWatch } from "react-hook-form";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";
import { SelectInput } from "@/components/admin/select-input";
import { Separator } from "@/components/ui/separator";

import { quoteStatuses, quoteServiceTypes } from "./quotesTypes";

export const QuoteInputs = () => {
  const status = useWatch({ name: "status" });

  return (
    <div className="flex flex-col gap-4">
      <ReferenceInput source="client_id" reference="clients">
        <AutocompleteInput
          label="Cliente"
          optionText="name"
          validate={required()}
          helperText={false}
        />
      </ReferenceInput>

      <SelectInput
        source="service_type"
        label="Tipo servizio"
        choices={quoteServiceTypes}
        optionText="label"
        optionValue="value"
        validate={required()}
        helperText={false}
      />

      <DateInput source="event_date" label="Data evento" helperText={false} />

      <TextInput
        source="description"
        label="Descrizione"
        multiline
        rows={3}
        helperText={false}
      />

      <NumberInput
        source="amount"
        label="Importo preventivo (EUR)"
        validate={[required(), minValue(0)]}
        defaultValue={0}
        helperText={false}
      />

      <Separator />

      <SelectInput
        source="status"
        label="Stato"
        choices={quoteStatuses}
        optionText="label"
        optionValue="value"
        defaultValue="primo_contatto"
        validate={required()}
        helperText={false}
      />

      <DateInput
        source="sent_date"
        label="Data invio preventivo"
        helperText={false}
      />

      <DateInput
        source="response_date"
        label="Data risposta"
        helperText={false}
      />

      {status === "rifiutato" && (
        <TextInput
          source="rejection_reason"
          label="Motivo rifiuto"
          multiline
          rows={2}
          helperText={false}
        />
      )}

      <TextInput
        source="notes"
        label="Note"
        multiline
        rows={2}
        helperText={false}
      />
    </div>
  );
};
