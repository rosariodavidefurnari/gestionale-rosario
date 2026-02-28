import { required, minValue, useGetOne } from "ra-core";
import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { TextInput } from "@/components/admin/text-input";
import { SelectInput } from "@/components/admin/select-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";

import type { Project, Quote } from "../types";
import { quoteStatusLabels } from "../quotes/quotesTypes";
import {
  paymentTypeChoices,
  paymentTypeDescriptions,
  paymentMethodChoices,
  paymentStatusChoices,
} from "./paymentTypes";
import {
  buildPaymentPatchFromQuote,
  shouldClearProjectForClient,
  shouldClearQuoteForClient,
} from "./paymentLinking";
import { toOptionalIdentifier } from "../quotes/quoteProjectLinking";

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
      validate={required()}
      helperText={false}
    />
    <LinkedQuoteInput />
    <ReferenceInput source="client_id" reference="clients">
      <SelectInput
        label="Cliente"
        optionText="name"
        validate={required()}
        helperText={false}
      />
    </ReferenceInput>
    <LinkedProjectInput />
  </div>
);

const LinkedQuoteInput = () => {
  const clientId = useWatch({ name: "client_id" });
  const quoteId = useWatch({ name: "quote_id" });
  const projectId = useWatch({ name: "project_id" });
  const { setValue } = useFormContext();
  const { data: selectedQuote } = useGetOne<Quote>(
    "quotes",
    {
      id: quoteId,
    },
    {
      enabled: !!quoteId,
    },
  );

  useEffect(() => {
    if (!selectedQuote) return;

    const patch = buildPaymentPatchFromQuote({
      quote: selectedQuote,
      currentClientId: clientId,
      currentProjectId: projectId,
    });

    if (patch.client_id != null) {
      setValue("client_id", patch.client_id, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (patch.project_id != null) {
      setValue("project_id", patch.project_id, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [clientId, projectId, selectedQuote, setValue]);

  useEffect(() => {
    if (
      shouldClearQuoteForClient({
        quote: selectedQuote,
        clientId,
      })
    ) {
      setValue("quote_id", null, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [clientId, selectedQuote, setValue]);

  return (
    <ReferenceInput
      source="quote_id"
      reference="quotes"
      filter={clientId ? { "client_id@eq": String(clientId) } : undefined}
    >
      <AutocompleteInput
        label="Preventivo collegato"
        helperText={false}
        placeholder="Seleziona un preventivo"
        parse={toOptionalIdentifier}
        optionText={(quote?: Quote) => {
          if (!quote) return "Preventivo";
          const description = quote.description?.trim() || "Preventivo";
          const status = quoteStatusLabels[quote.status] ?? quote.status;
          const amount = Number(quote.amount || 0).toLocaleString("it-IT", {
            style: "currency",
            currency: "EUR",
          });
          return `${description} · ${status} · ${amount}`;
        }}
      />
    </ReferenceInput>
  );
};

const LinkedProjectInput = () => {
  const clientId = useWatch({ name: "client_id" });
  const projectId = useWatch({ name: "project_id" });
  const { setValue } = useFormContext();
  const { data: selectedProject } = useGetOne<Project>(
    "projects",
    {
      id: projectId,
    },
    {
      enabled: !!projectId,
    },
  );

  useEffect(() => {
    if (
      shouldClearProjectForClient({
        project: selectedProject,
        clientId,
      })
    ) {
      setValue("project_id", null, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [clientId, selectedProject, setValue]);

  return (
    <ReferenceInput
      source="project_id"
      reference="projects"
      filter={clientId ? { "client_id@eq": String(clientId) } : undefined}
    >
      <AutocompleteInput
        label="Progetto"
        optionText="name"
        helperText={false}
        placeholder="Seleziona un progetto"
        parse={toOptionalIdentifier}
      />
    </ReferenceInput>
  );
};

const PaymentDetailInputs = () => (
  <div className="flex flex-col gap-4">
    <h6 className="text-lg font-semibold">Dettagli</h6>
    <SelectInput
      source="payment_type"
      label="Tipo"
      choices={paymentTypeChoices}
      optionText={(choice: { id: string; name: string }) => (
        <span title={paymentTypeDescriptions[choice.id]}>{choice.name}</span>
      )}
      validate={required()}
      helperText={false}
    />
    <NumberInput
      source="amount"
      label="Importo (EUR)"
      validate={[required(), minValue(0)]}
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
