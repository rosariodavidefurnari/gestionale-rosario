import type { Contact, ProjectContact, Sale, Tag } from "../../../types";
import type { ConfigurationContextValue } from "../../../root/ConfigurationContext";

export interface Db {
  contacts: Contact[];
  project_contacts: ProjectContact[];
  sales: Sale[];
  tags: Tag[];
  configuration: Array<{ id: number; config: ConfigurationContextValue }>;
}
