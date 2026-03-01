import { useMemo, useState } from "react";
import {
  useCreate,
  useDelete,
  useGetList,
  useGetMany,
  useNotify,
  useRefresh,
} from "ra-core";
import { Link } from "react-router";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import type { Contact, Project, ProjectContact } from "../types";
import { buildContactCreatePath } from "./contactLinking";
import {
  getContactDisplayName,
  getContactPrimaryEmail,
  getContactPrimaryPhone,
} from "./contactRecord";

export const ProjectContactsSection = ({ project }: { project: Project }) => {
  const { data: links, isPending } = useGetList<ProjectContact>(
    "project_contacts",
    {
      filter: { "project_id@eq": String(project.id) },
      pagination: { page: 1, perPage: 100 },
      sort: { field: "created_at", order: "ASC" },
    },
    { enabled: !!project.id },
  );
  const contactIds = (links ?? []).map((link) => link.contact_id);
  const { data: linkedContacts } = useGetMany<Contact>(
    "contacts",
    { ids: contactIds },
    { enabled: contactIds.length > 0 },
  );
  const [deleteOne, { isPending: isDeleting }] = useDelete();
  const notify = useNotify();
  const refresh = useRefresh();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Referenti progetto
        </h3>
        <div className="flex gap-2">
          <AddExistingProjectContactDialog
            project={project}
            linkedContacts={linkedContacts ?? []}
          />
          <Button asChild size="sm" variant="outline">
            <Link
              to={buildContactCreatePath({
                clientId: String(project.client_id),
                projectId: String(project.id),
              })}
            >
              Nuovo referente
            </Link>
          </Button>
        </div>
      </div>

      {isPending ? null : !linkedContacts?.length ? (
        <p className="text-sm text-muted-foreground">
          Nessun referente collegato a questo progetto.
        </p>
      ) : (
        <div className="space-y-2">
          {links?.map((link) => {
            const contact = linkedContacts.find(
              (item) => String(item.id) === String(link.contact_id),
            );

            if (!contact) {
              return null;
            }

            return (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border px-3 py-3 text-sm"
              >
                <div className="space-y-1">
                  <Link
                    to={`/contacts/${contact.id}/show`}
                    className="font-medium text-primary hover:underline"
                  >
                    {getContactDisplayName(contact)}
                  </Link>
                  {contact.title ? (
                    <p className="text-muted-foreground">{contact.title}</p>
                  ) : null}
                  <p className="text-muted-foreground">
                    {[
                      getContactPrimaryEmail(contact),
                      getContactPrimaryPhone(contact),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={isDeleting}
                  onClick={() =>
                    deleteOne(
                      "project_contacts",
                      { id: link.id, previousData: link },
                      {
                        mutationMode: "pessimistic",
                        onSuccess: () => {
                          notify("Collegamento progetto rimosso", {
                            type: "success",
                          });
                          refresh();
                        },
                      },
                    )
                  }
                  aria-label="Rimuovi referente dal progetto"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AddExistingProjectContactDialog = ({
  project,
  linkedContacts,
}: {
  project: Project;
  linkedContacts: Contact[];
}) => {
  const [open, setOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const { data: clientContacts } = useGetList<Contact>(
    "contacts",
    {
      filter: { "client_id@eq": String(project.client_id) },
      pagination: { page: 1, perPage: 100 },
      sort: { field: "last_name", order: "ASC" },
    },
    { enabled: open && !!project.client_id },
  );
  const [create, { isPending }] = useCreate();
  const notify = useNotify();
  const refresh = useRefresh();

  const availableContacts = useMemo(
    () =>
      (clientContacts ?? []).filter(
        (contact) =>
          !linkedContacts.some(
            (linkedContact) => String(linkedContact.id) === String(contact.id),
          ),
      ),
    [clientContacts, linkedContacts],
  );

  const handleConfirm = async () => {
    if (!selectedContactId) {
      return;
    }

    await create(
      "project_contacts",
      {
        data: {
          project_id: project.id,
          contact_id: selectedContactId,
          is_primary: false,
        },
      },
      {
        returnPromise: true,
        onSuccess: () => {
          notify("Referente collegato al progetto", { type: "success" });
          refresh();
          setSelectedContactId("");
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Collega esistente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collega referente esistente</DialogTitle>
          <DialogDescription>
            Seleziona un referente gia associato allo stesso cliente del
            progetto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="project-contact-select">Referente</Label>
          <select
            id="project-contact-select"
            value={selectedContactId}
            onChange={(event) => setSelectedContactId(event.target.value)}
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          >
            <option value="">Seleziona un referente</option>
            {availableContacts.map((contact) => (
              <option key={contact.id} value={String(contact.id)}>
                {getContactDisplayName(contact)}
              </option>
            ))}
          </select>
          {availableContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun referente cliente disponibile da collegare.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Chiudi
            </Button>
            <Button
              type="button"
              disabled={!selectedContactId || isPending}
              onClick={() => void handleConfirm()}
            >
              Collega
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
