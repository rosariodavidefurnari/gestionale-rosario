import { SelectInput } from "@/components/admin/select-input";
import { historicalAnalysisModelChoices } from "@/lib/analytics/historicalAnalysis";

export const AISettingsSection = () => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Scegli il modello OpenAI usato per generare l'analisi dello storico.
        La chiamata parte lato server e usa il payload semantico del dashboard
        storico, non le tabelle raw.
      </p>

      <SelectInput
        source="aiConfig.historicalAnalysisModel"
        label="Modello analisi storica"
        choices={historicalAnalysisModelChoices}
        optionText="label"
        optionValue="value"
        helperText={false}
      />
    </div>
  );
};
