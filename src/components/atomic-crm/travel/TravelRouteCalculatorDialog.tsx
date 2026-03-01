import { Loader2, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDataProvider, useNotify } from "ra-core";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { calculateKmReimbursement } from "@/lib/semantics/crmSemanticRegistry";
import type {
  TravelRouteEstimate,
  TravelRouteTripMode,
} from "@/lib/travelRouteEstimate";

import type { CrmDataProvider } from "../providers/types";

type TravelRouteCalculatorDialogProps = {
  defaultKmRate: number;
  currentKmRate?: number | null;
  initialDestination?: string;
  triggerLabel?: string;
  onApply: (estimate: TravelRouteEstimate) => void;
};

const toRateValue = (value: number | null | undefined, fallback: number) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
};

const roundCurrency = (value: number) => Number(value.toFixed(2));

export const TravelRouteCalculatorDialog = ({
  defaultKmRate,
  currentKmRate,
  initialDestination,
  triggerLabel = "Calcola tratta",
  onApply,
}: TravelRouteCalculatorDialogProps) => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState(initialDestination ?? "");
  const [tripMode, setTripMode] = useState<TravelRouteTripMode>("round_trip");
  const [kmRate, setKmRate] = useState(
    toRateValue(currentKmRate, defaultKmRate),
  );
  const [estimate, setEstimate] = useState<TravelRouteEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setOrigin("");
    setDestination(initialDestination ?? "");
    setTripMode("round_trip");
    setKmRate(toRateValue(currentKmRate, defaultKmRate));
    setEstimate(null);
  }, [open, initialDestination, currentKmRate, defaultKmRate]);

  const normalizedKmRate = toRateValue(kmRate, defaultKmRate);
  const displayEstimate = useMemo(() => {
    if (!estimate) {
      return null;
    }

    const reimbursementAmount =
      estimate.kmRate === normalizedKmRate && estimate.reimbursementAmount != null
        ? estimate.reimbursementAmount
        : roundCurrency(
            calculateKmReimbursement({
              kmDistance: estimate.totalDistanceKm,
              kmRate: normalizedKmRate,
              defaultKmRate,
            }),
          );

    return {
      ...estimate,
      kmRate: normalizedKmRate,
      reimbursementAmount,
    };
  }, [defaultKmRate, estimate, normalizedKmRate]);

  const invalidateEstimate = () => {
    setEstimate(null);
  };

  const calculate = async () => {
    if (!origin.trim()) {
      notify("Inserisci un luogo di partenza prima di calcolare i km.", {
        type: "warning",
      });
      return;
    }

    if (!destination.trim()) {
      notify("Inserisci un luogo di arrivo prima di calcolare i km.", {
        type: "warning",
      });
      return;
    }

    setIsCalculating(true);
    try {
      const nextEstimate = await dataProvider.estimateTravelRoute({
        origin,
        destination,
        tripMode,
        kmRate: normalizedKmRate,
      });
      setEstimate(nextEstimate);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Impossibile calcolare la tratta richiesta.",
        {
          type: "error",
        },
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const applyEstimate = () => {
    if (!displayEstimate) {
      return;
    }

    onApply(displayEstimate);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
        aria-label="Apri calcolatore tratta km"
      >
        <Route className="size-4" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Calcola tratta km</DialogTitle>
            <DialogDescription>
              Inserisci partenza, arrivo, tipo di tratta e tariffa km per
              precompilare i campi di spostamento.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="travel-route-origin">Luogo di partenza</Label>
              <Input
                id="travel-route-origin"
                value={origin}
                onChange={(event) => {
                  setOrigin(event.target.value);
                  invalidateEstimate();
                }}
                placeholder="Es. Valguarnera Caropepe"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="travel-route-destination">Luogo di arrivo</Label>
              <Input
                id="travel-route-destination"
                value={destination}
                onChange={(event) => {
                  setDestination(event.target.value);
                  invalidateEstimate();
                }}
                placeholder="Es. Catania"
              />
            </div>

            <div className="grid gap-2">
              <Label>Tipo di tratta</Label>
              <RadioGroup
                value={tripMode}
                onValueChange={(value) => {
                  if (value === "one_way" || value === "round_trip") {
                    setTripMode(value);
                    invalidateEstimate();
                  }
                }}
                className="grid gap-2 sm:grid-cols-2"
              >
                <label
                  htmlFor="travel-trip-one-way"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                >
                  <RadioGroupItem
                    id="travel-trip-one-way"
                    value="one_way"
                  />
                  <span className="text-sm font-medium">Solo andata</span>
                </label>
                <label
                  htmlFor="travel-trip-round-trip"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                >
                  <RadioGroupItem
                    id="travel-trip-round-trip"
                    value="round_trip"
                  />
                  <span className="text-sm font-medium">Andata e ritorno</span>
                </label>
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="travel-route-km-rate">Tariffa EUR/km</Label>
              <Input
                id="travel-route-km-rate"
                type="number"
                step="0.01"
                min="0"
                value={kmRate}
                onChange={(event) => {
                  setKmRate(Number(event.target.value));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Valore iniziale condiviso: EUR{" "}
                {defaultKmRate.toLocaleString("it-IT", {
                  minimumFractionDigits: 2,
                })}
                /km
              </p>
            </div>

            {displayEstimate ? (
              <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                <div className="grid gap-1">
                  <p className="font-medium">Tratta risolta</p>
                  <p className="text-muted-foreground">
                    {displayEstimate.originLabel} →{" "}
                    {displayEstimate.destinationLabel}
                  </p>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Km a tratta
                    </p>
                    <p className="font-semibold">
                      {displayEstimate.oneWayDistanceKm.toLocaleString("it-IT", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Km totali
                    </p>
                    <p className="font-semibold">
                      {displayEstimate.totalDistanceKm.toLocaleString("it-IT", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Durata totale stimata
                    </p>
                    <p className="font-semibold">
                      {displayEstimate.totalDurationMinutes.toLocaleString(
                        "it-IT",
                        {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        },
                      )}{" "}
                      min
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Rimborso stimato
                    </p>
                    <p className="font-semibold">
                      EUR{" "}
                      {displayEstimate.reimbursementAmount?.toLocaleString(
                        "it-IT",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      ) ?? "0,00"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={calculate}
              disabled={isCalculating}
            >
              {isCalculating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Route className="size-4" />
              )}
              Calcola
            </Button>
            <Button
              type="button"
              onClick={applyEstimate}
              disabled={!displayEstimate || isCalculating}
            >
              Applica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
