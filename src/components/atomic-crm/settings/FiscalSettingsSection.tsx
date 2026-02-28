import { useInput } from "ra-core";
import { useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrayInput } from "@/components/admin/array-input";
import { NumberInput } from "@/components/admin/number-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";
import { TextInput } from "@/components/admin/text-input";

import { projectCategoryChoices } from "../projects/projectTypes";

const CURRENT_YEAR = new Date().getFullYear();

export const FiscalSettingsSection = () => {
  const annoInizio = useWatch({ name: "fiscalConfig.annoInizioAttivita" });
  const aliquotaOverride = useWatch({ name: "fiscalConfig.aliquotaOverride" });

  const yearsActive = CURRENT_YEAR - (annoInizio || 2023);
  const isStartup = yearsActive < 5;
  const autoAliquota = isStartup ? 5 : 15;
  const effectiveAliquota = aliquotaOverride ?? autoAliquota;
  const lastStartupYear = (annoInizio || 2023) + 4;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Parametri per il calcolo di tasse e contributi nel Regime Forfettario. I
        dati sono usati nel simulatore fiscale della dashboard.
      </p>

      {/* ATECO Profiles */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-muted-foreground">
          Profili ATECO
        </h3>
        <p className="text-sm text-muted-foreground">
          Ogni codice ATECO ha un coefficiente di redditività diverso. Collega
          le categorie progetto al profilo corrispondente.
        </p>
        <ArrayInput
          source="fiscalConfig.taxProfiles"
          label={false}
          helperText={false}
        >
          <SimpleFormIterator disableReordering>
            <TextInput source="atecoCode" label="Codice ATECO" />
            <TextInput source="description" label="Descrizione" />
            <NumberInput
              source="coefficienteReddititivita"
              label="Coefficiente redditività %"
              min={0}
              max={100}
            />
            <LinkedCategoriesInput source="linkedCategories" />
          </SimpleFormIterator>
        </ArrayInput>
      </div>

      {/* Global Parameters */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-muted-foreground">
          Parametri globali
        </h3>

        <NumberInput
          source="fiscalConfig.annoInizioAttivita"
          label="Anno inizio attività"
          min={2000}
          max={CURRENT_YEAR}
        />

        {/* Auto-calculated tax rate */}
        <div className="space-y-1">
          <Label className="text-sm font-medium">
            Aliquota imposta sostitutiva
          </Label>
          <div className="flex items-center gap-2">
            <Badge variant={effectiveAliquota === 5 ? "default" : "secondary"}>
              {effectiveAliquota}%{" "}
              {effectiveAliquota === 5 ? "(startup)" : "(ordinaria)"}
            </Badge>
          </div>
          {isStartup && aliquotaOverride == null && (
            <p className="text-xs text-muted-foreground">
              Aliquota startup 5% valida fino al {lastStartupYear}. Dal{" "}
              {lastStartupYear + 1} si applicherà automaticamente il 15%.
            </p>
          )}
          <AliquotaOverrideToggle />
        </div>

        <NumberInput
          source="fiscalConfig.aliquotaINPS"
          label="Aliquota INPS Gestione Separata %"
          min={0}
          max={50}
          step={0.01}
        />

        <NumberInput
          source="fiscalConfig.tettoFatturato"
          label="Tetto fatturato €"
          min={1}
          max={200000}
        />
      </div>
    </div>
  );
};

/** Checkbox-based multi-select for project categories linked to an ATECO profile. */
const LinkedCategoriesInput = ({ source }: { source: string }) => {
  const {
    field: { value = [], onChange },
  } = useInput({ source });

  const selected: string[] = Array.isArray(value) ? value : [];

  const toggle = (categoryId: string) => {
    if (selected.includes(categoryId)) {
      onChange(selected.filter((c: string) => c !== categoryId));
    } else {
      onChange([...selected, categoryId]);
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">Categorie collegate</Label>
      <div className="flex flex-wrap gap-3">
        {projectCategoryChoices.map((cat) => (
          <label
            key={cat.id}
            className="flex items-center gap-1.5 text-sm cursor-pointer"
          >
            <Checkbox
              checked={selected.includes(cat.id)}
              onCheckedChange={() => toggle(cat.id)}
            />
            {cat.name}
          </label>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-amber-600">Nessuna categoria collegata</p>
      )}
    </div>
  );
};

/** Toggle to manually override the auto-calculated tax rate. */
const AliquotaOverrideToggle = () => {
  const {
    field: { value, onChange },
  } = useInput({ source: "fiscalConfig.aliquotaOverride" });

  const hasOverride = value != null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <Checkbox
        checked={hasOverride}
        onCheckedChange={(checked) => {
          onChange(checked ? 5 : undefined);
        }}
      />
      <span className="text-sm text-muted-foreground">
        Forza aliquota diversa
      </span>
      {hasOverride && (
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="text-sm border rounded px-2 py-1"
        >
          <option value={5}>5%</option>
          <option value={15}>15%</option>
        </select>
      )}
    </div>
  );
};
