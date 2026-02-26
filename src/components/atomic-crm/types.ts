import type { Identifier, RaRecord } from "ra-core";
import type { ComponentType } from "react";

import type {
  COMPANY_CREATED,
  CONTACT_CREATED,
  CONTACT_NOTE_CREATED,
  DEAL_CREATED,
  DEAL_NOTE_CREATED,
} from "./consts";

export type SignUpData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type SalesFormData = {
  avatar?: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  administrator: boolean;
  disabled: boolean;
};

export type Sale = {
  first_name: string;
  last_name: string;
  administrator: boolean;
  avatar?: RAFile;
  disabled?: boolean;
  user_id: string;

  /**
   * This is a copy of the user's email, to make it easier to handle by react admin
   * DO NOT UPDATE this field directly, it should be updated by the backend
   */
  email: string;

  /**
   * This is used by the fake rest provider to store the password
   * DO NOT USE this field in your code besides the fake rest provider
   * @deprecated
   */
  password?: string;
} & Pick<RaRecord, "id">;

export type Company = {
  name: string;
  logo: RAFile;
  sector: string;
  size: 1 | 10 | 50 | 250 | 500;
  linkedin_url: string;
  website: string;
  phone_number: string;
  address: string;
  zipcode: string;
  city: string;
  state_abbr: string;
  sales_id?: Identifier | null;
  created_at: string;
  description: string;
  revenue: string;
  tax_identifier: string;
  country: string;
  context_links?: string[];
  nb_contacts?: number;
  nb_deals?: number;
} & Pick<RaRecord, "id">;

export type EmailAndType = {
  email: string;
  type: "Work" | "Home" | "Other";
};

export type PhoneNumberAndType = {
  number: string;
  type: "Work" | "Home" | "Other";
};

export type Contact = {
  first_name: string;
  last_name: string;
  title: string;
  company_id?: Identifier | null;
  email_jsonb: EmailAndType[];
  avatar?: Partial<RAFile>;
  linkedin_url?: string | null;
  first_seen: string;
  last_seen: string;
  has_newsletter: boolean;
  tags: Identifier[];
  gender: string;
  sales_id?: Identifier | null;
  status: string;
  background: string;
  phone_jsonb: PhoneNumberAndType[];
  nb_tasks?: number;
  company_name?: string;
} & Pick<RaRecord, "id">;

export type Client = {
  name: string;
  client_type:
    | "produzione_tv"
    | "azienda_locale"
    | "privato_wedding"
    | "privato_evento"
    | "web";
  phone?: string;
  email?: string;
  address?: string;
  tax_id?: string;
  source?:
    | "instagram"
    | "facebook"
    | "passaparola"
    | "google"
    | "altro"
    | null;
  notes?: string;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

export type Project = {
  client_id: Identifier;
  name: string;
  category:
    | "produzione_tv"
    | "spot"
    | "wedding"
    | "evento_privato"
    | "sviluppo_web";
  tv_show?:
    | "bella_tra_i_fornelli"
    | "gustare_sicilia"
    | "vale_il_viaggio"
    | "altro"
    | null;
  status: "in_corso" | "completato" | "in_pausa" | "cancellato";
  start_date?: string;
  end_date?: string;
  budget?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

export type Service = {
  project_id: Identifier;
  service_date: string;
  service_type:
    | "riprese"
    | "montaggio"
    | "riprese_montaggio"
    | "fotografia"
    | "sviluppo_web"
    | "altro";
  fee_shooting: number;
  fee_editing: number;
  fee_other: number;
  discount: number;
  km_distance: number;
  km_rate: number;
  location?: string;
  invoice_ref?: string;
  notes?: string;
  created_at: string;
} & Pick<RaRecord, "id">;

export type Payment = {
  client_id: Identifier;
  project_id?: Identifier | null;
  quote_id?: Identifier | null;
  payment_date?: string;
  payment_type: "acconto" | "saldo" | "parziale" | "rimborso_spese";
  amount: number;
  method?: "bonifico" | "contanti" | "paypal" | "altro" | null;
  invoice_ref?: string;
  status: "ricevuto" | "in_attesa" | "scaduto";
  notes?: string;
  created_at: string;
} & Pick<RaRecord, "id">;

export type Expense = {
  project_id?: Identifier | null;
  client_id?: Identifier | null;
  expense_date: string;
  expense_type: "spostamento_km" | "acquisto_materiale" | "noleggio" | "altro";
  km_distance?: number;
  km_rate?: number;
  amount?: number;
  markup_percent?: number;
  description?: string;
  invoice_ref?: string;
  created_at: string;
} & Pick<RaRecord, "id">;

export type Quote = {
  client_id: Identifier;
  service_type: string;
  event_date?: string;
  description?: string;
  amount: number;
  status: string;
  sent_date?: string;
  response_date?: string;
  rejection_reason?: string;
  notes?: string;
  index: number;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

export type ContactNote = {
  contact_id: Identifier;
  text: string;
  date: string;
  sales_id: Identifier;
  status: string;
  attachments?: AttachmentNote[];
} & Pick<RaRecord, "id">;

export type Deal = {
  name: string;
  company_id: Identifier;
  contact_ids: Identifier[];
  category: string;
  stage: string;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  expected_closing_date: string;
  sales_id: Identifier;
  index: number;
} & Pick<RaRecord, "id">;

export type DealNote = {
  deal_id: Identifier;
  text: string;
  date: string;
  sales_id: Identifier;
  attachments?: AttachmentNote[];

  // This is defined for compatibility with `ContactNote`
  status?: undefined;
} & Pick<RaRecord, "id">;

export type Tag = {
  id: number;
  name: string;
  color: string;
};

export type Task = {
  contact_id: Identifier;
  type: string;
  text: string;
  due_date: string;
  done_date?: string | null;
  sales_id?: Identifier;
} & Pick<RaRecord, "id">;

export type ActivityCompanyCreated = {
  type: typeof COMPANY_CREATED;
  company_id: Identifier;
  company: Company;
  sales_id: Identifier;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityContactCreated = {
  type: typeof CONTACT_CREATED;
  company_id: Identifier;
  sales_id?: Identifier;
  contact: Contact;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityContactNoteCreated = {
  type: typeof CONTACT_NOTE_CREATED;
  sales_id?: Identifier;
  contactNote: ContactNote;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityDealCreated = {
  type: typeof DEAL_CREATED;
  company_id: Identifier;
  sales_id?: Identifier;
  deal: Deal;
  date: string;
};

export type ActivityDealNoteCreated = {
  type: typeof DEAL_NOTE_CREATED;
  sales_id?: Identifier;
  dealNote: DealNote;
  date: string;
};

export type Activity = RaRecord &
  (
    | ActivityCompanyCreated
    | ActivityContactCreated
    | ActivityContactNoteCreated
    | ActivityDealCreated
    | ActivityDealNoteCreated
  );

export interface RAFile {
  src: string;
  title: string;
  path?: string;
  rawFile: File;
  type?: string;
}

export type AttachmentNote = RAFile;

export interface LabeledValue {
  value: string;
  label: string;
}

export type DealStage = LabeledValue;

export interface NoteStatus extends LabeledValue {
  color: string;
}

export interface ContactGender {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}
