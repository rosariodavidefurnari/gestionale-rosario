import { useState, useEffect } from "react";
import { Merge, CircleX, AlertTriangle, ArrowDown } from "lucide-react";
import {
  useDataProvider,
  useRecordContext,
  useGetList,
  useGetManyReference,
  required,
  Form,
  useNotify,
  useRedirect,
} from "ra-core";
import type { Identifier } from "ra-core";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReferenceInput } from "@/components/admin/reference-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Contact } from "../types";
import { contactOptionText } from "../misc/ContactOption";

export const ContactMergeButton = () => {
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        className="h-6 cursor-pointer"
        size="sm"
        onClick={() => setMergeDialogOpen(true)}
      >
        <Merge className="w-4 h-4" />
        Unisci con un altro contatto
      </Button>
      <ContactMergeDialog
        open={mergeDialogOpen}
        onClose={() => setMergeDialogOpen(false)}
      />
    </>
  );
};

interface ContactMergeDialogProps {
  open: boolean;
  onClose: () => void;
}

const ContactMergeDialog = ({ open, onClose }: ContactMergeDialogProps) => {
  const loserContact = useRecordContext<Contact>();
  const notify = useNotify();
  const redirect = useRedirect();
  const dataProvider = useDataProvider();
  const [winnerId, setWinnerId] = useState<Identifier | null>(null);
  const [suggestedWinnerId, setSuggestedWinnerId] = useState<Identifier | null>(
    null,
  );
  const [isMerging, setIsMerging] = useState(false);
  const { mutateAsync } = useMutation({
    mutationKey: ["contacts", "merge", { loserId: loserContact?.id, winnerId }],
    mutationFn: async () => {
      return dataProvider.mergeContacts(loserContact?.id, winnerId);
    },
  });

  // Find potential contacts with matching first and last name
  const { data: matchingContacts } = useGetList(
    "contacts",
    {
      filter: {
        first_name: loserContact?.first_name,
        last_name: loserContact?.last_name,
        "id@neq": `${loserContact?.id}`, // Exclude current contact
      },
      pagination: { page: 1, perPage: 10 },
    },
    { enabled: open && !!loserContact },
  );

  // Get counts of items to be merged
  const canFetchCounts = open && !!loserContact && !!winnerId;
  const { total: tasksCount } = useGetManyReference(
    "tasks",
    {
      target: "contact_id",
      id: loserContact?.id,
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: canFetchCounts },
  );

  const { total: notesCount } = useGetManyReference(
    "contact_notes",
    {
      target: "contact_id",
      id: loserContact?.id,
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: canFetchCounts },
  );

  const { total: dealsCount } = useGetList(
    "deals",
    {
      filter: { "contact_ids@cs": `{${loserContact?.id}}` },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: canFetchCounts },
  );

  useEffect(() => {
    if (matchingContacts && matchingContacts.length > 0) {
      const suggestedWinnerId = matchingContacts[0].id;
      setSuggestedWinnerId(suggestedWinnerId);
      setWinnerId(suggestedWinnerId);
    }
  }, [matchingContacts]);

  const handleMerge = async () => {
    if (!winnerId || !loserContact) {
      notify("Seleziona un contatto con cui unire", { type: "warning" });
      return;
    }

    try {
      setIsMerging(true);
      await mutateAsync();
      setIsMerging(false);
      notify("Contatti uniti con successo", { type: "success" });
      redirect(`/contacts/${winnerId}/show`);
      onClose();
    } catch (error) {
      setIsMerging(false);
      notify("Errore durante l'unione dei contatti", { type: "error" });
      console.error("Merge failed:", error);
    }
  };

  if (!loserContact) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="md:min-w-lg max-w-2xl">
        <DialogHeader>
          <DialogTitle>Unisci Contatto</DialogTitle>
          <DialogDescription>
            Unisci questo contatto con un altro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="font-medium text-sm">
              Contatto corrente (verrà eliminato)
            </p>
            <div className="font-medium text-sm mt-4">{contactOptionText}</div>

            <div className="flex justify-center my-4">
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </div>

            <p className="font-medium text-sm mb-2">
              Contatto destinazione (verrà mantenuto)
            </p>
            <Form>
              <ReferenceInput
                source="winner_id"
                reference="contacts"
                filter={{ "id@neq": loserContact.id }}
              >
                <AutocompleteInput
                  label=""
                  optionText={contactOptionText}
                  validate={required()}
                  onChange={setWinnerId}
                  defaultValue={suggestedWinnerId}
                  helperText={false}
                />
              </ReferenceInput>
            </Form>
          </div>

          {winnerId && (
            <>
              <div className="space-y-2">
                <p className="font-medium text-sm">Cosa verrà unito:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  {notesCount != null && notesCount > 0 && (
                    <li>
                      • {notesCount} nota
                      {notesCount !== 1 ? "e" : ""} verranno riassegnate
                    </li>
                  )}
                  {tasksCount != null && tasksCount > 0 && (
                    <li>
                      • {tasksCount} attivit
                      {tasksCount !== 1 ? "à" : "à"} verranno riassegnate
                    </li>
                  )}
                  {dealsCount != null && dealsCount > 0 && (
                    <li>
                      • {dealsCount} trattativ
                      {dealsCount !== 1 ? "e" : "a"} verranno aggiornate
                    </li>
                  )}
                  {loserContact.email_jsonb?.length > 0 && (
                    <li>
                      • {loserContact.email_jsonb.length} indirizzo email
                      {loserContact.email_jsonb.length !== 1 ? "i" : ""} verranno
                      aggiunti
                    </li>
                  )}
                  {loserContact.phone_jsonb?.length > 0 && (
                    <li>
                      • {loserContact.phone_jsonb.length} numero di telefono
                      verranno aggiunti
                    </li>
                  )}
                  {!notesCount &&
                    !tasksCount &&
                    !dealsCount &&
                    !loserContact.email_jsonb?.length &&
                    !loserContact.phone_jsonb?.length && (
                      <li className="text-muted-foreground/60">
                        Nessun dato aggiuntivo da unire
                      </li>
                    )}
                </ul>
              </div>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attenzione: operazione distruttiva</AlertTitle>
                <AlertDescription>
                  Tutti i dati verranno trasferiti al secondo contatto. Questa
                  azione non può essere annullata.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isMerging}>
            <CircleX />
            Annulla
          </Button>
          <Button onClick={handleMerge} disabled={!winnerId || isMerging}>
            <Merge />
            {isMerging ? "Unione in corso..." : "Unisci Contatti"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
