import { Button } from "@/components/ui/button";
import { useGetList, useGetMany, useShowContext } from "ra-core";
import { Link } from "react-router";

import type { Client, Project, ProjectContact, Contact } from "../types";
import { buildContactCreatePath } from "./contactLinking";
import {
  getContactDisplayName,
  getContactPrimaryEmail,
  getContactPrimaryPhone,
} from "./contactRecord";

export const ClientContactsSection = () => {
  const { record } = useShowContext<Client>();
  const { data: contacts, isPending } = useGetList<Contact>(
    "contacts",
    {
      filter: { "client_id@eq": String(record?.id ?? "") },
      pagination: { page: 1, perPage: 100 },
      sort: { field: "updated_at", order: "DESC" },
    },
    { enabled: !!record?.id },
  );
  const contactIds = (contacts ?? []).map((contact) => contact.id);
  const { data: projectLinks } = useGetList<ProjectContact>(
    "project_contacts",
    {
      filter: {},
      pagination: { page: 1, perPage: 500 },
      sort: { field: "created_at", order: "ASC" },
    },
    { enabled: contactIds.length > 0 },
  );
  const relevantProjectLinks = (projectLinks ?? []).filter((link) =>
    contactIds.some(
      (contactId) => String(contactId) === String(link.contact_id),
    ),
  );
  const projectIds = [
    ...new Set(relevantProjectLinks.map((link) => link.project_id)),
  ];
  const { data: projects } = useGetMany<Project>(
    "projects",
    { ids: projectIds },
    { enabled: projectIds.length > 0 },
  );

  if (!record) {
    return null;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Referenti
        </h3>
        <Button asChild size="sm" variant="outline">
          <Link
            to={buildContactCreatePath({
              clientId: String(record.id),
            })}
          >
            Nuovo referente
          </Link>
        </Button>
      </div>

      {isPending ? null : !contacts?.length ? (
        <p className="text-sm text-muted-foreground">
          Nessun referente associato a questo cliente.
        </p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => {
            const linkedProjectNames = relevantProjectLinks
              .filter((link) => String(link.contact_id) === String(contact.id))
              .map(
                (link) =>
                  projects?.find(
                    (project) => String(project.id) === String(link.project_id),
                  )?.name ?? "Progetto",
              );

            return (
              <div
                key={contact.id}
                className="rounded-lg border px-3 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
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
                    {[
                      getContactPrimaryEmail(contact),
                      getContactPrimaryPhone(contact),
                    ]
                      .filter(Boolean)
                      .map((value) => (
                        <p key={value} className="text-muted-foreground">
                          {value}
                        </p>
                      ))}
                    {linkedProjectNames.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Progetti: {linkedProjectNames.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
