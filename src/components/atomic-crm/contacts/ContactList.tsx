import { CreateButton } from "@/components/admin/create-button";
import { List } from "@/components/admin/list";
import { SortButton } from "@/components/admin/sort-button";
import { useCreatePath, useGetMany, useListContext } from "ra-core";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

import type { Client, Contact } from "../types";
import { TopToolbar } from "../layout/TopToolbar";
import { ErrorMessage } from "../misc/ErrorMessage";
import {
  getContactDisplayName,
  getContactPrimaryEmail,
  getContactPrimaryPhone,
} from "./contactRecord";

export const ContactList = () => (
  <List
    title={false}
    actions={<ContactListActions />}
    perPage={25}
    sort={{ field: "updated_at", order: "DESC" }}
  >
    <ContactListLayout />
  </List>
);

const ContactListActions = () => {
  const isMobile = useIsMobile();

  return (
    <TopToolbar className={isMobile ? "justify-center" : undefined}>
      <SortButton fields={["last_name", "first_name", "updated_at"]} />
      <CreateButton />
    </TopToolbar>
  );
};

const ContactListLayout = () => {
  const { data, isPending, error } = useListContext<Contact>();
  const createPath = useCreatePath();
  const isMobile = useIsMobile();
  const clientIds = [
    ...new Set(data?.map((contact) => contact.client_id).filter(Boolean)),
  ];
  const { data: clients } = useGetMany<Client>(
    "clients",
    { ids: clientIds as string[] },
    { enabled: clientIds.length > 0 },
  );
  const clientById = new Map(
    (clients ?? []).map((client) => [String(client.id), client.name]),
  );

  if (error) {
    return <ErrorMessage />;
  }

  if (isPending || !data) {
    return null;
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground mb-4">Nessun referente</p>
        <CreateButton />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="mt-4 flex flex-col divide-y px-4">
        {data.map((contact) => (
          <ContactMobileCard
            key={contact.id}
            contact={contact}
            link={createPath({
              resource: "contacts",
              type: "show",
              id: contact.id,
            })}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referente</TableHead>
            <TableHead>Ruolo</TableHead>
            <TableHead className="hidden md:table-cell">Contatti</TableHead>
            <TableHead className="hidden lg:table-cell">Cliente</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              clientName={
                contact.client_id
                  ? clientById.get(String(contact.client_id))
                  : null
              }
              link={createPath({
                resource: "contacts",
                type: "show",
                id: contact.id,
              })}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ContactRow = ({
  contact,
  clientName,
  link,
}: {
  contact: Contact;
  clientName?: string | null;
  link: string;
}) => {
  const primaryEmail = getContactPrimaryEmail(contact);
  const primaryPhone = getContactPrimaryPhone(contact);

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell>
        <div className="space-y-1.5">
          <Link to={link} className="font-medium text-primary hover:underline">
            {getContactDisplayName(contact)}
          </Link>
          <div className="flex flex-wrap gap-1">
            {primaryEmail ? (
              <Badge variant="outline" className="text-[11px]">
                {primaryEmail}
              </Badge>
            ) : null}
            {primaryPhone ? (
              <Badge variant="outline" className="text-[11px]">
                {primaryPhone}
              </Badge>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{contact.title}</TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        {[primaryEmail, primaryPhone].filter(Boolean).join(" · ")}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground">
        {clientName ?? ""}
      </TableCell>
    </TableRow>
  );
};

const ContactMobileCard = ({
  contact,
  link,
}: {
  contact: Contact;
  link: string;
}) => (
  <Link to={link} className="flex flex-col gap-1 px-1 py-3 active:bg-muted/50">
    <span className="text-sm font-medium">
      {getContactDisplayName(contact)}
    </span>
    {contact.title ? (
      <span className="text-xs text-muted-foreground">{contact.title}</span>
    ) : null}
    {(getContactPrimaryEmail(contact) || getContactPrimaryPhone(contact)) && (
      <span className="text-xs text-muted-foreground">
        {[getContactPrimaryEmail(contact), getContactPrimaryPhone(contact)]
          .filter(Boolean)
          .join(" · ")}
      </span>
    )}
  </Link>
);
