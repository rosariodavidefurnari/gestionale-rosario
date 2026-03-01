import { SelectInput } from "@/components/admin/select-input";
import { historicalAnalysisModelChoices } from "@/lib/analytics/historicalAnalysis";
import { invoiceExtractionModelChoices } from "@/lib/ai/invoiceExtractionModel";

export const AISettingsSection = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scegli il modello AI usato per generare le analisi di Storico, Annuale
          e le risposte read-only della chat CRM unificata su clienti,
          referenti, progetti, pagamenti e spese. La chiamata parte lato server
          e usa payload semantici, non le tabelle raw.
        </p>

        <SelectInput
          source="aiConfig.historicalAnalysisModel"
          label="Modello analisi e risposte CRM"
          choices={historicalAnalysisModelChoices}
          optionText="label"
          optionValue="value"
          helperText={false}
        />
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scegli il modello Gemini che verra' usato per estrarre dati da fatture
          miste nella chat AI unificata. Questo setting resta separato dai
          modelli usati per le analisi testuali.
        </p>

        <SelectInput
          source="aiConfig.invoiceExtractionModel"
          label="Modello estrazione fatture"
          choices={invoiceExtractionModelChoices}
          optionText="label"
          optionValue="value"
          helperText={false}
        />
      </div>
    </div>
  );
};
