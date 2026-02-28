import { required, minValue } from "ra-core";
import { useWatch } from "react-hook-form";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";
import { DateTimeInput } from "@/components/admin/date-time-input";
import { BooleanInput } from "@/components/admin/boolean-input";
import { SelectInput } from "@/components/admin/select-input";
import { Separator } from "@/components/ui/separator";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { quoteStatuses } from "./quotesTypes";

export const QuoteInputs = () => {
  const status = useWatch({ name: "status" });
  const allDay = useWatch({ name: "all_day" }) ?? true;
  const { quoteServiceTypes } = useConfigurationContext();

  const DateComponent = allDay ? DateInput : DateTimeInput;

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

      <BooleanInput
        source="all_day"
        label="Tutto il giorno"
        defaultValue={true}
      />
      <DateComponent
        source="event_start"
        label="Data inizio evento"
        helperText={false}
      />
      <DateComponent
        source="event_end"
        label="Data fine evento"
        validate={(value: string, allValues: Record<string, unknown>) => {
          if (value && allValues.event_start && value < (allValues.event_start as string)) {
            return "La data fine non può essere prima della data inizio";
          }
        }}
        helperText={false}
      />

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
        validate={(value: string, allValues: Record<string, unknown>) => {
          if (!value && allValues.status && allValues.status !== "primo_contatto") {
            return "Obbligatoria per questo stato";
          }
        }}
        helperText={false}
      />

      <DateInput
        source="response_date"
        label="Data risposta"
        validate={(value: string, allValues: Record<string, unknown>) => {
          const needsResponse = [
            "accettato", "acconto_ricevuto", "in_lavorazione",
            "completato", "saldato", "rifiutato",
          ];
          if (!value && needsResponse.includes(allValues.status as string)) {
            return "Obbligatoria per questo stato";
          }
          if (value && allValues.sent_date && value < (allValues.sent_date as string)) {
            return "La data risposta non può essere prima della data invio";
          }
        }}
        helperText={false}
      />

      {status === "rifiutato" && (
        <TextInput
          source="rejection_reason"
          label="Motivo rifiuto"
          validate={required()}
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
