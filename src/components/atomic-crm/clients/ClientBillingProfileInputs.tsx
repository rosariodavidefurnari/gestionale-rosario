import { BooleanInput } from "@/components/admin/boolean-input";
import { TextInput } from "@/components/admin/text-input";

export const ClientBillingProfileInputs = () => (
  <div className="grid gap-3 md:grid-cols-2">
    <TextInput source="label" label="Etichetta" helperText={false} />
    <TextInput
      source="billing_name"
      label="Denominazione fiscale"
      helperText={false}
    />
    <TextInput source="vat_number" label="Partita IVA" helperText={false} />
    <TextInput source="fiscal_code" label="Codice fiscale" helperText={false} />
    <TextInput
      source="billing_address_street"
      label="Via/Piazza"
      helperText={false}
    />
    <TextInput
      source="billing_address_number"
      label="Civico"
      helperText={false}
    />
    <TextInput source="billing_postal_code" label="CAP" helperText={false} />
    <TextInput source="billing_city" label="Comune" helperText={false} />
    <TextInput source="billing_province" label="Provincia" helperText={false} />
    <TextInput source="billing_country" label="Nazione" helperText={false} />
    <TextInput
      source="billing_sdi_code"
      label="Codice destinatario"
      helperText={false}
    />
    <TextInput source="billing_pec" label="PEC" helperText={false} />
    <div className="md:col-span-2">
      <BooleanInput
        source="is_default"
        label="Usa come intestatario predefinito"
        helperText={false}
      />
    </div>
    <div className="md:col-span-2">
      <TextInput source="notes" label="Note" multiline rows={3} />
    </div>
  </div>
);
