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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Clapperboard } from "lucide-react";
import type { Project } from "../types";
import { QuickEpisodeForm, getDefaultFees } from "./QuickEpisodeForm";

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

  const handleSubmit = async (data: {
    service_date: string;
    service_type: string;
    fee_shooting: number;
    fee_editing: number;
    fee_other: number;
    km_distance: number;
    km_rate: number;
    location: string;
    notes: string;
    createPayment: boolean;
    paymentType: string;
    paymentStatus: string;
  }) => {
    setSaving(true);
    try {
      // 1. Create service
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

      // 2. Create km expense if km > 0
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

      // 3. Create payment if requested
      if (data.createPayment) {
        const totalFees =
          data.fee_shooting + data.fee_editing + data.fee_other;
        const kmCost = data.km_distance * data.km_rate;
        await create(
          "payments",
          {
            data: {
              client_id: record.client_id,
              project_id: record.id,
              payment_type: data.paymentType,
              amount: totalFees + kmCost,
              status: data.paymentStatus,
              notes: data.location
                ? `Puntata ${data.service_date} — ${data.location}`
                : `Puntata ${data.service_date}`,
            },
          },
          { returnPromise: true },
        );
      }

      notify("Puntata registrata con successo", { type: "success" });
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
          Registra Puntata
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
