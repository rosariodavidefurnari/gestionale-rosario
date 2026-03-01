import { CreateBase, Form } from "ra-core";
import { useMemo } from "react";
import { useLocation } from "react-router";
import { Card, CardContent } from "@/components/ui/card";

import { ClientInputs } from "./ClientInputs";
import {
  getClientCreateDefaultsFromSearch,
  getClientCreateLauncherContextFromSearch,
} from "./clientLinking";
import { FormToolbar } from "../layout/FormToolbar";

const getLauncherBannerCopy = (search: string) => {
  const handoff = getClientCreateLauncherContextFromSearch(search);

  if (!handoff) {
    return null;
  }

  return "Aperto dall'import fatture AI con anagrafica fiscale precompilata. Completa il tipo cliente e verifica i dati di fatturazione prima di salvare.";
};

export const ClientCreate = () => {
  const location = useLocation();
  const defaultValues = useMemo(
    () => getClientCreateDefaultsFromSearch(location.search),
    [location.search],
  );
  const launcherBanner = useMemo(
    () => getLauncherBannerCopy(location.search),
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
                <ClientInputs />
                <FormToolbar />
              </CardContent>
            </Card>
          </Form>
        </div>
      </div>
    </CreateBase>
  );
};
