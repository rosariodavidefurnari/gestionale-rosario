import { useState } from "react";
import { useCreate, useNotify, useRefresh } from "ra-core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clapperboard } from "lucide-react";
import type { Project } from "../types";
import {
  QuickEpisodeForm,
  getDefaultFees,
  type EpisodeFormData,
} from "./QuickEpisodeForm";

interface QuickEpisodeDialogProps {
  record: Project;
}

export const QuickEpisodeDialog = ({ record }: QuickEpisodeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [create] = useCreate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [saving, setSaving] = useState(false);

  const defaults = getDefaultFees(record.tv_show);

  const handleSubmit = async (data: EpisodeFormData) => {
    setSaving(true);
    try {
      await create(
        "services",
        {
          data: {
            project_id: record.id,
            service_date: data.service_date,
            service_type: data.service_type,
            fee_shooting: data.fee_shooting,
            fee_editing: data.fee_editing,
            fee_other: data.fee_other,
            discount: 0,
            km_distance: data.km_distance,
            km_rate: data.km_rate,
            location: data.location || null,
            notes: data.notes || null,
          },
        },
        { returnPromise: true },
      );

      if (data.km_distance > 0) {
        await create(
          "expenses",
          {
            data: {
              project_id: record.id,
              client_id: record.client_id,
              expense_date: data.service_date,
              expense_type: "spostamento_km",
              km_distance: data.km_distance,
              km_rate: data.km_rate,
              description: data.location
                ? `Spostamento — ${data.location}`
                : "Spostamento",
            },
          },
          { returnPromise: true },
        );
      }

      notify("Puntata registrata", { type: "success" });
      refresh();
      setOpen(false);
    } catch {
      notify("Errore durante la registrazione", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Clapperboard className="size-4 mr-1" />
          Puntata
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registra Puntata — {record.name}</DialogTitle>
        </DialogHeader>
        <QuickEpisodeForm
          defaults={defaults}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
