import { Plus, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetList, useNotify } from "ra-core";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Client, ClientBillingProfile } from "../types";
import { CreateSheet } from "../misc/CreateSheet";
import { EditSheet } from "../misc/EditSheet";
import { ClientBillingProfileInputs } from "./ClientBillingProfileInputs";

const clean = (value?: string | null) => value?.trim() || "";

const formatProfileAddress = (profile: ClientBillingProfile) => {
  const street = [
    clean(profile.billing_address_street),
    clean(profile.billing_address_number),
  ]
    .filter(Boolean)
    .join(", ");
  const city = [
    clean(profile.billing_postal_code),
    clean(profile.billing_city),
    clean(profile.billing_province),
  ]
    .filter(Boolean)
    .join(" ");
  return [street, city, clean(profile.billing_country)]
    .filter(Boolean)
    .join(" · ");
};

const getProfileIdentityLines = (profile: ClientBillingProfile) =>
  [
    clean(profile.vat_number) ? `P.IVA: ${clean(profile.vat_number)}` : null,
    clean(profile.fiscal_code) ? `CF: ${clean(profile.fiscal_code)}` : null,
    clean(profile.billing_sdi_code)
      ? `Codice destinatario: ${clean(profile.billing_sdi_code)}`
      : null,
    clean(profile.billing_pec) ? `PEC: ${clean(profile.billing_pec)}` : null,
  ].filter((line): line is string => Boolean(line));

export const ClientBillingProfilesSection = ({
  client,
}: {
  client: Client;
}) => {
  const notify = useNotify();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const {
    data: rawProfiles = [],
    isPending,
    refetch,
  } = useGetList<ClientBillingProfile>(
    "client_billing_profiles",
    {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "is_default", order: "DESC" },
      filter: { "client_id@eq": String(client.id) },
    },
    { enabled: !!client.id },
  );
  const profiles = useMemo(
    () =>
      [...rawProfiles].sort((a, b) => {
        if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
        return a.label.localeCompare(b.label, "it");
      }),
    [rawProfiles],
  );

  const handleMutationSuccess = (message: string) => {
    notify(message, { type: "info" });
    setCreateOpen(false);
    setEditingId(null);
    void refetch();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h6 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Intestatari collegati
          </h6>
          <p className="text-xs text-muted-foreground">
            Profili fiscali alternativi dello stesso cliente operativo.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Aggiungi
        </Button>
      </div>

      {profiles.length > 0 ? (
        <div className="space-y-2">
          {profiles.map((profile) => {
            const address = formatProfileAddress(profile);
            const identityLines = getProfileIdentityLines(profile);
            return (
              <div
                key={profile.id}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{profile.label}</span>
                      {profile.is_default ? (
                        <Badge variant="secondary">Predefinito</Badge>
                      ) : null}
                    </div>
                    <p className="font-medium">{profile.billing_name}</p>
                    {address ? (
                      <p className="text-xs text-muted-foreground">{address}</p>
                    ) : null}
                    {identityLines.map((line) => (
                      <p key={line} className="text-xs text-muted-foreground">
                        {line}
                      </p>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Modifica ${profile.label}`}
                    onClick={() => setEditingId(String(profile.id))}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !isPending && (
          <p className="text-sm text-muted-foreground">
            Nessun intestatario alternativo collegato.
          </p>
        )
      )}

      <CreateSheet
        resource="client_billing_profiles"
        title="Nuovo intestatario fattura"
        open={createOpen}
        onOpenChange={setCreateOpen}
        redirect={false}
        defaultValues={{
          client_id: client.id,
          is_default: false,
          billing_country: "IT",
        }}
        mutationOptions={{
          onSuccess: () => handleMutationSuccess("Intestatario aggiunto"),
        }}
      >
        <ClientBillingProfileInputs />
      </CreateSheet>

      {editingId ? (
        <EditSheet
          resource="client_billing_profiles"
          id={editingId}
          title="Modifica intestatario fattura"
          open={!!editingId}
          onOpenChange={(open) => {
            if (!open) setEditingId(null);
          }}
          redirect={false}
          mutationMode="pessimistic"
          mutationOptions={{
            onSuccess: () => handleMutationSuccess("Intestatario aggiornato"),
          }}
        >
          <ClientBillingProfileInputs />
        </EditSheet>
      ) : null}
    </div>
  );
};
