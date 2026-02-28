import type { Identifier, RaRecord } from "ra-core";

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
  email: string;
  /** @deprecated Only used by FakeRest provider */
  password?: string;
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
  tags: Identifier[];
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

export type ClientTask = {
  client_id?: Identifier | null;
  text: string;
  type: string;
  due_date: string;
  all_day: boolean;
  done_date?: string | null;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

export type ClientNote = {
  client_id: Identifier;
  text: string;
  date: string;
  attachments?: AttachmentNote[];
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
  all_day: boolean;
  budget?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

export type Service = {
  project_id: Identifier;
  service_date: string;
  service_end?: string;
  all_day: boolean;
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
  payment_type: "acconto" | "saldo" | "parziale" | "rimborso_spese" | "rimborso";
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
  expense_type: "spostamento_km" | "acquisto_materiale" | "noleggio" | "altro" | "credito_ricevuto";
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
  event_start?: string;
  event_end?: string;
  all_day: boolean;
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

export type Tag = {
  id: number;
  name: string;
  color: string;
};

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

export interface NoteStatus extends LabeledValue {
  color: string;
}

/** Tax profile for a single ATECO code under Regime Forfettario.
 *  Links project categories to a specific profitability coefficient. */
export interface FiscalTaxProfile {
  atecoCode: string;
  description: string;
  coefficienteReddititivita: number; // percentage, e.g. 78
  linkedCategories: string[];
}

/** Complete fiscal configuration stored in Settings.
 *  All fields configurable from UI and persisted to DB via configuration JSONB. */
export interface FiscalConfig {
  taxProfiles: FiscalTaxProfile[];
  aliquotaINPS: number; // 26.07
  tettoFatturato: number; // 85000
  annoInizioAttivita: number; // 2023
  /** Override manuale dell'aliquota sostitutiva.
   *  Se undefined/null → calcolo automatico: 5% primi 5 anni, 15% dal 6°.
   *  Se valorizzato → usa questo valore (per casistiche particolari). */
  aliquotaOverride?: number;
}
