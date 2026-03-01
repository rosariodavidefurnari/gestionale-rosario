import { CreateBase, Form } from "ra-core";
import { useMemo } from "react";
import { useLocation } from "react-router";
import { Card, CardContent } from "@/components/ui/card";

import { PaymentInputs } from "./PaymentInputs";
import {
  getPaymentCreateDefaultsFromSearch,
  getUnifiedAiHandoffContextFromSearch,
} from "./paymentLinking";
import { FormToolbar } from "../layout/FormToolbar";

const getUnifiedAiBannerCopy = (search: string) => {
  const handoff = getUnifiedAiHandoffContextFromSearch(search);

  if (!handoff) {
    return null;
  }

  if (handoff.action === "quote_create_payment") {
    return "Aperto dalla chat AI unificata: preventivo, cliente e progetto sono gia precompilati. Controlla i dati prima di salvare.";
  }

  if (handoff.action === "client_create_payment") {
    return "Aperto dalla chat AI unificata: il cliente e gia precompilato. Completa il pagamento e verifica eventuali collegamenti mancanti.";
  }

  return "Aperto dalla chat AI unificata: il form e' stato indirizzato qui come superficie commerciale gia approvata. Verifica i dati prima di salvare.";
};

export const PaymentCreate = () => {
  const location = useLocation();
  const defaultValues = useMemo(
    () => getPaymentCreateDefaultsFromSearch(location.search),
    [location.search],
  );
  const launcherBanner = useMemo(
    () => getUnifiedAiBannerCopy(location.search),
    [location.search],
  );

  return (
    <CreateBase redirect="show">
      <div className="mt-2 flex">
        <div className="flex-1">
          <Form defaultValues={defaultValues}>
            {launcherBanner ? (
              <div className="mb-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                {launcherBanner}
              </div>
            ) : null}
            <Card>
              <CardContent>
                <PaymentInputs />
                <FormToolbar />
              </CardContent>
            </Card>
          </Form>
        </div>
      </div>
    </CreateBase>
  );
};
