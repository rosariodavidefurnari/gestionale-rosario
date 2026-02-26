import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export interface FeeDefaults {
  fee_shooting: number;
  fee_editing: number;
  fee_other: number;
  service_type: string;
  km_rate: number;
}

/** Pre-fill fees based on tv_show type */
export const getDefaultFees = (
  tvShow?: string | null,
): FeeDefaults => {
  switch (tvShow) {
    case "gustare_sicilia":
      return { fee_shooting: 233, fee_editing: 311, fee_other: 0, service_type: "riprese_montaggio", km_rate: 0.19 };
    case "bella_tra_i_fornelli":
    case "vale_il_viaggio":
      return { fee_shooting: 233, fee_editing: 156, fee_other: 0, service_type: "riprese_montaggio", km_rate: 0.19 };
    default:
      return { fee_shooting: 0, fee_editing: 0, fee_other: 0, service_type: "riprese_montaggio", km_rate: 0.19 };
  }
};

interface Props {
  defaults: FeeDefaults;
  saving: boolean;
  onSubmit: (data: {
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
  }) => void;
  onCancel: () => void;
}

export const QuickEpisodeForm = ({ defaults, saving, onSubmit, onCancel }: Props) => {
  const [serviceDate, setServiceDate] = useState("");
  const [feeShooting, setFeeShooting] = useState(defaults.fee_shooting);
  const [feeEditing, setFeeEditing] = useState(defaults.fee_editing);
  const [feeOther, setFeeOther] = useState(defaults.fee_other);
  const [kmDistance, setKmDistance] = useState(0);
  const [kmRate] = useState(defaults.km_rate);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [createPayment, setCreatePayment] = useState(false);
  const [paymentType, setPaymentType] = useState("saldo");
  const [paymentStatus, setPaymentStatus] = useState("in_attesa");

  const totalFees = feeShooting + feeEditing + feeOther;
  const kmCost = kmDistance * kmRate;
  const grandTotal = totalFees + kmCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceDate) return;
    onSubmit({
      service_date: serviceDate,
      service_type: defaults.service_type,
      fee_shooting: feeShooting,
      fee_editing: feeEditing,
      fee_other: feeOther,
      km_distance: kmDistance,
      km_rate: kmRate,
      location,
      notes,
      createPayment,
      paymentType,
      paymentStatus,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="ep-date">Data *</Label>
          <Input id="ep-date" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="ep-shooting">Riprese (EUR)</Label>
          <Input id="ep-shooting" type="number" step="0.01" value={feeShooting} onChange={(e) => setFeeShooting(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="ep-editing">Montaggio (EUR)</Label>
          <Input id="ep-editing" type="number" step="0.01" value={feeEditing} onChange={(e) => setFeeEditing(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="ep-other">Altro (EUR)</Label>
          <Input id="ep-other" type="number" step="0.01" value={feeOther} onChange={(e) => setFeeOther(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="ep-km">Km</Label>
          <Input id="ep-km" type="number" step="1" value={kmDistance} onChange={(e) => setKmDistance(Number(e.target.value))} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="ep-location">Località</Label>
          <Input id="ep-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="es. Catania" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="ep-notes">Note</Label>
          <Input id="ep-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg bg-muted p-3 text-sm">
        <div className="flex justify-between">
          <span>Compensi</span>
          <span className="font-medium">€{totalFees.toFixed(2)}</span>
        </div>
        {kmDistance > 0 && (
          <div className="flex justify-between">
            <span>Km ({kmDistance} × €{kmRate})</span>
            <span className="font-medium">€{kmCost.toFixed(2)}</span>
          </div>
        )}
        <Separator className="my-1" />
        <div className="flex justify-between font-bold">
          <span>Totale</span>
          <span>€{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="ep-payment"
          checked={createPayment}
          onCheckedChange={(v) => setCreatePayment(v === true)}
        />
        <Label htmlFor="ep-payment" className="cursor-pointer">
          Crea anche pagamento (€{grandTotal.toFixed(2)})
        </Label>
      </div>

      {createPayment && (
        <div className="grid grid-cols-2 gap-3 pl-6">
          <div>
            <Label htmlFor="ep-ptype">Tipo</Label>
            <select
              id="ep-ptype"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="saldo">Saldo</option>
              <option value="acconto">Acconto</option>
              <option value="rimborso_spese">Rimborso spese</option>
            </select>
          </div>
          <div>
            <Label htmlFor="ep-pstatus">Stato</Label>
            <select
              id="ep-pstatus"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="in_attesa">In attesa</option>
              <option value="ricevuto">Ricevuto</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Annulla
        </Button>
        <Button type="submit" disabled={saving || !serviceDate}>
          {saving ? "Salvataggio..." : "Registra"}
        </Button>
      </div>
    </form>
  );
};
