# Spec — Billing profiles application integration

Stato: `reviewed`
Data: 2026-06-22
Relazione: estende la spec backend
`docs/superpowers/specs/2026-06-22-client-billing-profiles-design.md` dopo i
commit `3d71e90b` e `dec80565`.

## 1. Problema

Il backend ora distingue il cliente operativo (`clients`) dal destinatario
fiscale opzionale (`client_billing_profiles`). L'applicazione pero' emette e
mostra ancora le bozze fattura usando solo i campi fiscali del client.

Caso reale: Gustare Sicilia resta cliente operativo, Diego resta referente e i
progetti restano sotto Gustare; alcune fatture devono pero' uscire intestate a
LIVE SRLS. Senza propagazione applicativa, una futura emissione da Gustare
continuerebbe a produrre XML/PDF intestati a Gustare e
`financial_documents.billing_profile_id` resterebbe nullo.

## 2. Obiettivi

1. Far attraversare un destinatario fiscale selezionabile il flusso bozza →
   emissione → XML → PDF.
2. Salvare `billing_profile_id` in `financial_documents` quando la fattura viene
   emessa con un profilo.
3. Mostrare nella scheda cliente i profili di fatturazione collegati, senza
   duplicare clienti, contatti o progetti.
4. Mostrare nelle superfici Fatture quando un documento usa un intestatario
   diverso dal cliente operativo.
5. Mantenere la UI sobria e operativa secondo `PRODUCT.md` e Impeccable:
   distinzione visibile solo dove evita errori fiscali.

## 3. Non-obiettivi

- Non creare LIVE come nuovo client operativo.
- Non cambiare dashboard, KPI o calcoli fiscali: il profilo di fatturazione non
  cambia cassa, competenza o imponibile.
- Non esporre ancora i billing profiles alla chat AI generale, salvo il minimo
  necessario all'import fatture.
- Non gestire acconti pregressi nell'emissione: resta il blocco v1 gia'
  presente in `useEmitInvoice`.
- Non cambiare i dati gia' backfillati su prod.

## 4. Fonti di verita'

- Schema reale: `client_billing_profiles` e
  `financial_documents.billing_profile_id`.
- View reale: `financial_documents_summary` con campi `billing_profile_*`.
- Dati reali: `Fatture/2026/IT01879020517A2026_bVF6w.xml` e
  `Fatture/2026/IT01879020517A2026_cBc8j.xml`.
- Contratto emissione: `supabase/functions/_shared/invoiceEmit.ts` e
  `supabase/functions/invoice_emit/index.ts`.
- Contratto draft: `src/components/atomic-crm/invoicing/invoiceDraftTypes.ts`.
- UI prodotto: `PRODUCT.md`, `ClientShow`, `InvoiceDraftDialog`,
  `FinancialDocumentListContent`, `FinancialDocumentShow`.

## 5. Decisioni

### 5.1 Recipient derivato, non client duplicato

Il draft porta sempre il `client` operativo e puo' portare un
`billingProfile`. Un helper puro deve produrre un `InvoiceBillingRecipient`:

- senza profilo: usa i campi fiscali del client;
- con profilo: usa i campi del profilo e conserva il client operativo.

XML/PDF/gate emissione devono consumare il recipient, non scegliere da soli tra
client e profilo.

### 5.2 Default prudente

Nel dialog bozza fattura:

- se il client non ha profili, non cambia nulla;
- se ha profili, compare un selettore `Intestatario fattura`;
- l'opzione iniziale e' il client principale, salvo profilo con
  `is_default=true`;
- LIVE non va auto-selezionato solo perche' e' l'unico profilo di Gustare,
  perche' non tutte le fatture Gustare sono intestate a LIVE.

### 5.3 Edge Function fail-closed

`billingProfileId` e' opzionale nel payload `invoice_emit`. Se presente:

- deve essere una stringa non vuota;
- viene scritto in `financial_documents.billing_profile_id`;
- non cambia `payments.amount`, `status`, `payment_date`, `payment_type`;
- non cambia idempotenza naturale, ancora basata su
  `(client_id, direction, document_number, issue_date)`.

### 5.4 Import AI minimo

L'import fatture puo' gia' estrarre anagrafica fiscale. Questa tranche deve
almeno rendere disponibile il workspace profili e risolvere un record LIVE verso
`clientId=Gustare` + `billingProfileId=LIVE` quando i dati fiscali coincidono.
La UI AI puo' mostrare il profilo come dettaglio, ma non serve esporlo alla chat
CRM generale.

Nota di persistenza: il flusso import conferma oggi crea `payments`, `expenses`
o `services`, non `financial_documents`. Quindi `billingProfileId` serve a
risolvere correttamente il cliente operativo e a validare il profilo nella Edge
Function `invoice_import_confirm`; non va inventata una colonna profilo su
`payments`. I dettagli fiscali restano nelle note/audit finche' una futura spec
non importerà direttamente `financial_documents`.

## 6. Superfici da propagare

1. Tipi: `ClientBillingProfile`, `InvoiceDraftInput`,
   `FinancialDocumentSummary`, import draft.
2. Helper fiscali: display name, address, identity lines, validation.
3. Bozza fattura: selezione destinatario, preview, emit payload, XML, PDF.
4. Edge Function: validation, insert document, tests.
5. Scheda cliente: elenco profili collegati, creazione/modifica minimale.
6. Fatture list/show: mostrare `billing_profile_name` quando diverso dal client.
7. Import fatture: workspace + matching profilo, UI anagrafica fiscale, payload
   e validazione `invoice_import_confirm`.
8. Docs/continuity e CANTIERE.

## 7. UX / Impeccable

Registro: `product`.

Physical scene: Rosario controlla una scheda cliente o una bozza fattura mentre
sta preparando un XML per Aruba; deve capire in pochi secondi se la fattura
uscira' a Gustare o LIVE senza leggere spiegazioni lunghe.

Principi UI:

- usare controlli familiari: select per destinatario, bottoni standard, sheet o
  dialog esistenti per edit/create;
- niente card decorative: il profilo e' una sotto-sezione operativa della
  fatturazione cliente;
- copy breve: `Intestatario fattura`, `Cliente principale`, `Profilo LIVE`;
- mobile: il selettore e il riepilogo destinatario devono stare sopra i bottoni
  PDF/XML/emissione, senza overflow.

## 8. Rischi

| Rischio | Contromisura |
| --- | --- |
| XML emesso a Gustare invece che LIVE | test XML su recipient LIVE |
| PDF diverso da XML | helper recipient unico per entrambi |
| `billing_profile_id` scritto con profilo di altro client | UI filtra per client; Edge riceve solo id, DB FK protegge esistenza; test server conserva client_id |
| LIVE auto-selezionato su fatture Gustare non LIVE | default solo `is_default=true` |
| Fatture list poco chiara | mostra client operativo + intestatario solo se diverso |
| Mobile perde la scelta | browser mobile obbligatorio |
| AI import crea cliente LIVE duplicato | matching profilo prima del fallback create-client |
| Import promette persistenza profilo dove non esiste colonna | `billingProfileId` validato nel payload, dettagli fiscali in note; nessuna colonna nuova su `payments` |

## 9. Criteri di accettazione

- `buildInvoiceDraftXml` con profilo LIVE produce Denominazione LIVE, P.IVA/CF
  LIVE, indirizzo LIVE e codice destinatario KRRH6B9.
- `downloadInvoiceDraftPdf`/documento PDF mostrano lo stesso destinatario del
  XML.
- `runEmitInvoice` passa `billingProfileId` quando selezionato.
- `buildFinancialDocumentInsert` scrive `billing_profile_id`.
- `InvoiceDraftDialog` permette di scegliere tra cliente principale e profili.
- `ClientShow` mostra e permette gestione minimale dei profili.
- `FinancialDocumentListContent` e `FinancialDocumentShow` mostrano
  l'intestatario profilo quando presente.
- Import AI risolve LIVE come profilo di Gustare, non come nuovo cliente; la
  conferma server valida che il profilo appartenga al client operativo quando
  `billingProfileId` e' presente.
- Gate: typecheck, lint, unit/focused tests, health financial, browser desktop e
  mobile con console pulita.

## 10. Review multidimensione spec

- Dominio: PASS. La spec conserva cliente operativo e destinatario fiscale come
  concetti separati.
- DB/FK/RLS: PASS. Usa la migration gia' applicata; nessuna nuova migration.
- Money/fiscalita': PASS. Non cambia cash; aggiunge solo recipient fiscale.
- Propagazione: PASS. Elenca draft, provider, Edge Function, XML, PDF, fatture,
  client UI e import.
- Desktop/mobile: FLAG gestibile. Browser desktop/mobile obbligatorio dopo
  implementazione.
- AI/semantica: FLAG gestibile. Import AI incluso; chat generale esclusa.
- Sicurezza: PASS. Nessun nuovo bypass RLS; dataProvider e Edge Function restano
  nei canali autenticati esistenti.
- Test/controllori: PASS. Richiede test pure + Edge + UI focused + health.
- Governance/RAG: PASS. code-RAG usato e claim verificati su sorgente reale.
- Operativita': PASS. Nessun deploy Supabase Edge Function remoto dimenticato:
  questa tranche tocca `supabase/functions/invoice_emit/**` e
  `supabase/functions/invoice_import_confirm/**`, quindi serve deploy manuale
  dopo commit/push.

## 11. Review spec — seconda tornata obbligatoria

Trigger: review richiesta esplicitamente prima di considerare valido il piano.

- RAG pre-review: query su superfici `client_billing_profiles`,
  `billing_profile_id`, invoice emit, XML/PDF, import e UI.
- Finding reale: FLAG. La prima stesura nominava import matching ma non
  dichiarava esplicitamente `InvoiceImportDraftBillingSection`,
  `supabase/functions/_shared/invoiceImportConfirm.ts` e
  `supabase/functions/invoice_import_confirm/index.ts`.
- Fix applicato: §5.4, §6, §8, §9 e §10 aggiornati. Il profilo import non viene
  promesso come persistenza su `payments`; viene usato per risoluzione/validazione
  e audit.
- Esito dopo fix:
  - Dominio: PASS.
  - DB/FK/RLS: PASS, nessuna nuova colonna oltre a quelle gia' migrate.
  - Money/fiscalita': PASS, cash invariato.
  - Propagazione: PASS, incluse Edge Function import conferma e UI anagrafica
    fiscale import.
  - Desktop/mobile: FLAG da chiudere in browser dopo implementazione.
  - AI/semantica: PASS per import; chat CRM generale esclusa.
  - Governance/RAG: PASS, finding verificato su sorgente reale.
