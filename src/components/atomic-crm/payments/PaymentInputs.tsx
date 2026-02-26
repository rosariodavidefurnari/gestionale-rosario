import { required } from "ra-core";
import { Separator } from "@/components/ui/separator";
import { TextInput } from "@/components/admin/text-input";
import { SelectInput } from "@/components/admin/select-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";

import {
  paymentTypeChoices,
  paymentMethodChoices,
  paymentStatusChoices,
} from "./paymentTypes";

export const PaymentInputs = () => (
  <div className="flex flex-col gap-2 p-1">
    <div className="flex gap-6 flex-col md:flex-row">
      <div className="flex flex-col gap-10 flex-1">
        <PaymentIdentityInputs />
      </div>
      <Separator
        orientation="vertical"
        className="flex-shrink-0 hidden md:block"
      />
      <div className="flex flex-col gap-10 flex-1">
        <PaymentDetailInputs />
      </div>
    </div>
  </div>
);

const PaymentIdentityInputs = () => (
  <div className="flex flex-col gap-4">
    <h6 className="text-lg font-semibold">Pagamento</h6>
    <DateInput
      source="payment_date"
      label="Data pagamento"
      helperText={false}
    />
    <ReferenceInput source="client_id" reference="clients">
      <SelectInput
        label="Cliente"
        optionText="name"
        validate={required()}
        helperText={false}
      />
    </ReferenceInput>
    <ReferenceInput source="project_id" reference="projects">
      <SelectInput
        label="Progetto"
        optionText="name"
        helperText={false}
      />
    </ReferenceInput>
  </div>
);

const PaymentDetailInputs = () => (
  <div className="flex flex-col gap-4">
    <h6 className="text-lg font-semibold">Dettagli</h6>
    <SelectInput
      source="payment_type"
      label="Tipo"
      choices={paymentTypeChoices}
      validate={required()}
      helperText={false}
    />
    <NumberInput
      source="amount"
      label="Importo (EUR)"
      validate={required()}
      helperText={false}
    />
    <SelectInput
      source="method"
      label="Metodo pagamento"
      choices={paymentMethodChoices}
      helperText={false}
    />
    <TextInput source="invoice_ref" label="Rif. Fattura" helperText={false} />
    <SelectInput
      source="status"
      label="Stato"
      choices={paymentStatusChoices}
      defaultValue="in_attesa"
      helperText={false}
    />
    <TextInput source="notes" label="Note" multiline helperText={false} />
  </div>
);
