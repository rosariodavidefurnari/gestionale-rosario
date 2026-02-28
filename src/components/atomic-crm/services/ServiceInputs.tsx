import { required, minValue } from "ra-core";
import { useWatch } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { TextInput } from "@/components/admin/text-input";
import { SelectInput } from "@/components/admin/select-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";
import { DateTimeInput } from "@/components/admin/date-time-input";
import { BooleanInput } from "@/components/admin/boolean-input";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { ServiceTotals } from "./ServiceTotals";

export const ServiceInputs = () => {
  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="flex gap-6 flex-col md:flex-row">
        <div className="flex flex-col gap-10 flex-1">
          <ServiceIdentityInputs />
          <ServiceFeeInputs />
        </div>
        <Separator
          orientation="vertical"
          className="flex-shrink-0 hidden md:block"
        />
        <div className="flex flex-col gap-10 flex-1">
          <ServiceKmInputs />
          <ServiceExtraInputs />
        </div>
      </div>
    </div>
  );
};

const ServiceIdentityInputs = () => {
  const { serviceTypeChoices } = useConfigurationContext();
  const allDay = useWatch({ name: "all_day" }) ?? true;
  const DateComponent = allDay ? DateInput : DateTimeInput;

  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Servizio</h6>
      <BooleanInput
        source="all_day"
        label="Tutto il giorno"
        defaultValue={true}
      />
      <DateComponent
        source="service_date"
        label="Data inizio"
        validate={required()}
        helperText={false}
      />
      <DateComponent
        source="service_end"
        label="Data fine"
        validate={(value: string, allValues: Record<string, unknown>) => {
          if (
            value &&
            allValues.service_date &&
            value < (allValues.service_date as string)
          ) {
            return "La data fine non può essere prima della data inizio";
          }
        }}
        helperText={false}
      />
      <ReferenceInput source="project_id" reference="projects">
        <SelectInput
          label="Progetto"
          optionText="name"
          validate={required()}
          helperText={false}
        />
      </ReferenceInput>
      <SelectInput
        source="service_type"
        label="Tipo servizio"
        choices={serviceTypeChoices}
        optionText="label"
        optionValue="value"
        validate={required()}
        helperText={false}
      />
    </div>
  );
};

const ServiceFeeInputs = () => (
  <div className="flex flex-col gap-4">
    <h6 className="text-lg font-semibold">Compensi</h6>
    <NumberInput
      source="fee_shooting"
      label="Compenso riprese (EUR)"
      defaultValue={0}
      validate={minValue(0)}
      helperText={false}
    />
    <NumberInput
      source="fee_editing"
      label="Compenso montaggio (EUR)"
      defaultValue={0}
      validate={minValue(0)}
      helperText={false}
    />
    <NumberInput
      source="fee_other"
      label="Compenso altro (EUR)"
      defaultValue={0}
      validate={minValue(0)}
      helperText={false}
    />
    <NumberInput
      source="discount"
      label="Sconto (EUR)"
      defaultValue={0}
      validate={minValue(0)}
      helperText={false}
    />
    <ServiceTotals />
  </div>
);

const ServiceKmInputs = () => {
  const kmDistance = useWatch({ name: "km_distance" }) ?? 0;
  const kmRate = useWatch({ name: "km_rate" }) ?? 0.19;
  const kmReimbursement = kmDistance * kmRate;

  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Spostamento</h6>
      <NumberInput
        source="km_distance"
        label="Km percorsi"
        defaultValue={0}
        validate={minValue(0)}
        helperText={false}
      />
      <NumberInput
        source="km_rate"
        label="Tariffa km (EUR)"
        defaultValue={0.19}
        validate={minValue(0)}
        helperText={false}
      />
      <div className="text-sm font-medium px-1">
        Rimborso km:{" "}
        <span className="font-bold">
          EUR{" "}
          {kmReimbursement.toLocaleString("it-IT", {
            minimumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
};

const ServiceExtraInputs = () => (
  <div className="flex flex-col gap-4">
    <h6 className="text-lg font-semibold">Dettagli</h6>
    <TextInput source="location" label="Localit&agrave;" helperText={false} />
    <TextInput source="invoice_ref" label="Rif. Fattura" helperText={false} />
    <TextInput source="notes" label="Note" multiline helperText={false} />
  </div>
);
