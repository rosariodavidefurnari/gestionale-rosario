# Spec - Profili di fatturazione cliente

Stato: `draft-backend-first`, nessun codice applicato.
Data: 2026-06-22
Autore: agente
Relazione: sostituisce la bozza `document-billing-recipient-snapshot`.

---

## 1. Problema

Gli XML 2026 mostrano un caso normale nei gestionali: il rapporto operativo e'
Gustare/Diego, ma alcune fatture sono intestate a LIVE SRLS.

Le due verita' sono:

- cliente/account operativo: `ASSOCIAZIONE CULTURALE GUSTARE SICILIA`;
- intestatario fattura: `LIVE - SOCIETA' A RESPONSABILITA' LIMITATA
  SEMPLIFICATA`.

Altri gestionali risolvono con indirizzi/profili di fatturazione o gerarchie
cliente, non duplicando tutto il lavoro. Per questo la soluzione backend
corretta e' aggiungere profili di fatturazione collegati al cliente operativo.

## 2. Evidenza

- `FPR 1/26` e `FPR 2/26` in `Fatture/2026/` sono intestate a LIVE SRLS.
- I payment e i progetti sono sotto Gustare.
- Diego Caltabiano e' gia' referente di Gustare.
- Il modello attuale ha un solo set di dati fiscali su `clients`.
- I progetti hanno un solo `client_id`; associare lo stesso progetto a due
  clienti richiederebbe una nuova relazione molti-a-molti, piu' invasiva.

## 3. Decisione

Creare un dominio backend minimo:

- `clients` resta l'account operativo;
- `client_billing_profiles` contiene gli intestatari fiscali usabili da quel
  cliente;
- `financial_documents.billing_profile_id` puo' indicare quale profilo di
  fatturazione e' stato usato per quella fattura.

Nel caso reale:

- client: Gustare Sicilia;
- billing profile: LIVE SRLS;
- fatture `FPR 1/26` e `FPR 2/26`: `client_id=Gustare`,
  `billing_profile_id=LIVE`.

## 4. Obiettivi backend v1

1. Introdurre `client_billing_profiles` come tabella business con RLS.
2. Collegare opzionalmente `financial_documents` a un billing profile.
3. Esporre i dati del billing profile nella view `financial_documents_summary`.
4. Preparare il backfill 2026 per creare/riusare il profilo LIVE e collegarlo
   alle fatture corrette.
5. Non toccare UI, emissione fattura, PDF/XML generator, dashboard, AI o fiscal
   model.

## 5. Non-obiettivi

Questi non-obiettivi valgono per la tranche backend v1, non per il prodotto
finito. Dopo la stabilizzazione del contratto dati, le superfici applicative
vanno affrontate in una fase separata.

- Non creare LIVE come client separato.
- Non duplicare progetti o contatti.
- Non introdurre `projects_clients` o altra many-to-many.
- Non cambiare `invoice_emit`, `invoice_void`, `InvoiceDraftDialog`,
  `invoiceDraftXml.ts` o `invoiceDraftPdf.tsx`.
- Non applicare modifiche remote senza gate C1/dry-run/C3.
- Non cambiare importi, stato o date dei payment.

## 6. Modello backend

### 6.1 Tabella `client_billing_profiles`

Campi:

- `id uuid primary key default gen_random_uuid()`
- `client_id uuid not null references clients(id)`
- `label text not null`
- `billing_name text not null`
- `vat_number text`
- `fiscal_code text`
- `billing_address_street text`
- `billing_address_number text`
- `billing_postal_code text`
- `billing_city text`
- `billing_province text`
- `billing_country text default 'IT'`
- `billing_sdi_code text`
- `billing_pec text`
- `is_default boolean default false not null`
- `notes text`
- `created_at timestamptz default now() not null`
- `updated_at timestamptz default now() not null`

Vincoli:

- RLS abilitata con policy authenticated full access come le altre business
  tables.
- FK `client_id` NO ACTION, coerente con hardening cascade protection.
- Unique parziale consigliata: un solo default per cliente.
- Indici su `client_id`, `vat_number`, `fiscal_code`.

### 6.2 Collegamento documenti

`financial_documents` riceve:

- `billing_profile_id uuid references client_billing_profiles(id)`

La FK e' nullable per compatibilita' storica.

### 6.3 View `financial_documents_summary`

La view espone:

- `billing_profile_id`
- `billing_profile_label`
- `billing_profile_name`
- `billing_profile_vat_number`
- `billing_profile_fiscal_code`
- `billing_profile_sdi_code`

`client_name` resta il cliente operativo.

## 7. Backfill 2026

Dopo la migration backend:

- creare/riusare billing profile LIVE sotto Gustare;
- inserire `FPR 1/26` e `FPR 2/26` con `client_id=Gustare` e
  `billing_profile_id=LIVE`;
- inserire/linkare LAURUS 2026 con client LAURUS e, se utile, profilo default
  LAURUS;
- non creare payment nuovi per `FPR 5/26`;
- non inferire importi documento dai payment.

## 8. Fase applicativa successiva

Dopo backend v1 e review, il lavoro completo dovra' propagare il nuovo dominio
dove serve. Questa propagazione e' intenzionale, ma va isolata in una spec/piano
separata per evitare modifiche a cascata non controllate.

Superfici da valutare nella fase successiva:

- UI cliente: lettura/creazione/modifica dei billing profiles.
- Bozza fattura: scelta del billing profile quando il cliente ha piu'
  intestatari.
- `invoice_emit`: payload emissione collegato al profilo scelto.
- XML e PDF: dati intestatario presi dal profilo, non solo da `client`.
- Import/backfill: collegamento `billing_profile_id` quando l'XML indica un
  intestatario diverso dal cliente operativo.
- Lista/show fatture: visualizzazione chiara di cliente operativo e
  intestatario fattura, se utile.
- Mobile parity: stesse informazioni e stesse azioni essenziali del desktop.
- Dashboard: da toccare solo se deve mostrare intestatari; i KPI di cassa
  restano basati su `payments`.
- AI/semantica: da toccare solo se il profilo fatturazione viene esposto alle
  risposte o ai tool AI.

La fase UI/UX richiedera' skill `impeccable`, preflight dichiarato, browser
desktop reale, browser mobile reale, console pulita e review visuale.

## 9. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Propagazione UI infinita | Backend-only v1, UI separata |
| LIVE creato come cliente operativo | Guardrail: profilo LIVE deve avere `client_id=Gustare` |
| Storico fatture cambia se profilo viene editato | Per v1 i profili sono trattati come dati amministrativi stabili; snapshot per-documento resta v2 se serve immutabilita' forte |
| Dashboard cambia | Dashboard non legge `billing_profile_id` |
| Cassa cambia | Backfill aggiorna solo documenti/FK, mai amount/status/date |

## 10. Criteri di accettazione backend v1

- Esiste tabella `client_billing_profiles` con RLS e FK a `clients`.
- `financial_documents.billing_profile_id` e' nullable e non rompe documenti
  storici.
- `financial_documents_summary` espone i dati del billing profile.
- Health check riconosce LIVE come billing profile di Gustare, non come client
  richiesto.
- Nessun file UI/emissione/PDF/XML/dashboard/AI/fiscal viene modificato.
- `npm run typecheck`, `npm run lint`, `npm run health:financial`,
  `npm run smoke:ef-reminder-parity`, `npm run continuity:check` passano.

## 11. Review, RAG e governance

Questa spec e ogni revisione successiva devono passare una review
multidimensione prima di produrre o approvare il piano:

- dominio cliente/profilo fatturazione;
- DB, FK, RLS e migration replayable;
- money/fiscalita' e garanzia che la cassa non cambi;
- propagazione consumer e superfici rinviate fuori dalla tranche backend;
- test, controllori e health check;
- governance map per comandi, variabili, workflow e artefatti;
- code-RAG locale per impatto cross-file, con ogni claim verificato sul
  sorgente reale;
- operativita', dry-run, rollback e commit scope.

Ogni implementazione derivata da questa spec deve avere una review
multidimensione post-implementazione prima dei gate finali e prima di qualunque
commit.

UI/UX resta fuori dalla v1. Se una fase futura tocca UI o UX, diventa obbligatorio
usare lo skill `impeccable`, caricare il contesto richiesto dallo skill,
dichiarare il preflight `IMPECCABLE_PREFLIGHT`, e verificare in browser reale
desktop e mobile con console controllata.

## 12. Stop point

Prima del codice backend, comunicare all'utente i file esatti. Prima di apply
remoto, mostrare C1 e dry-run. UI solo in fase separata.
