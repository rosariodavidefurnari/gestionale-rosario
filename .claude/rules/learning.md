# Claude Auto-Correction System

> **Questo file NON è documentazione**. È il mio sistema di apprendimento
> automatico. Ogni entry è un trigger che mi costringe a comportarmi
> diversamente. I trigger critici sono anche coperti dai file auto-loaded
> in `.claude/rules/` (architecture.md, supabase.md, session-workflow.md).

---

## Rituale di sessione

1. Leggo questo file all'inizio di ogni sessione
2. Applico i trigger alla situazione attuale
3. Se imparo qualcosa di nuovo, aggiorno PRIMA di chiudere

---

## Indice trigger per categoria

| Cat.         | ID    | Trigger                                   |
| ------------ | ----- | ----------------------------------------- |
| **UI**       | UI-1  | Nuova lista desktop → resizable columns   |
| **UI**       | UI-2  | Nuovo filtro entità → FilterPopover       |
| **UI**       | UI-3  | Nuova pagina lista → MobilePageTitle      |
| **UI**       | UI-4  | Input numerici → MAI `?? 0`               |
| **UI**       | UI-5  | useEffect + formState → ciclo infinito    |
| **UI**       | UI-6  | Import `@/components/admin` → no barrel   |
| **DB**       | DB-1  | Enum/Choice → aggiorna TUTTE le superfici |
| **DB**       | DB-2  | Nuova migration → checklist replayability |
| **DB**       | DB-3  | km servizi → spesa auto da trigger DB     |
| **DB**       | DB-4  | View con meno colonne → DROP prima        |
| **DB**       | DB-5  | Frontend→trigger invariant → audit dup    |
| **Backend**  | BE-1  | Edge Function modificata → deploy manuale |
| **Backend**  | BE-2  | Nuova Edge Function → config.toml!        |
| **Backend**  | BE-3  | Schema change → riavviare edge runtime    |
| **Backend**  | BE-4  | Deduplica servizi → includere description |
| **Dominio**  | DOM-1 | Fiscale = CASSA, non competenza           |
| **Dominio**  | DOM-2 | Forfettario ≠ regime ordinario            |
| **Config**   | CFG-1 | Nuova configurazione → 3 file obbligatori |
| **Workflow** | WF-1  | Aggiorno continuity-map → aggiorna indice |
| **Workflow** | WF-2  | prettier drift .ts/.tsx → root-cause risolta (lint-staged+CI) |
| **Workflow** | WF-3  | Destructuring param → verificare completo |
| **Workflow** | WF-4  | Aggiorno file sistema → sweep incrociata  |
| **Workflow** | WF-5  | E2E test → valida sistema, non adattare   |
| **Workflow** | WF-6  | Commit codice → docs+memoria STESSO       |
| **UI**       | UI-7  | Desktop props → verificare mobile         |
| **UI**       | UI-8  | Nuova superficie AI → card unificata      |
| **UI**       | UI-9  | Estimator/helper form → mai auto-scrivere campi business |
| **UI**       | UI-10 | Card "quanto mi devono" → vista canonica balance_due, non payment rows |
| **Backend**  | BE-5  | EF env vars → stop+start NON restart      |
| **Backend**  | BE-6  | Reload remoto → TRUNCATE prima load       |
| **Workflow** | WF-7  | Dopo push → controlla CI autonomo         |
| **Dominio**  | DOM-3 | FatturaPA XML → schema XSD + Aruba        |
| **Dominio**  | DOM-7 | FatturaPA Descrizione → solo Latin-1 (`€`/`–` vietati) |
| **Dominio**  | DOM-8 | Forfettario → 3 numeri INPS distinti, formula standard giusta, total_inps intoccabile |
| **Dominio**  | DOM-4 | Stato semantico ≠ `array.length`          |
| **Config**   | CFG-2 | BusinessProfile → merge defaults safe     |
| **Config**   | CFG-3 | Flag/prop root → verificare consumo reale |
| **Config**   | CFG-4 | Edge Functions in repo misto → scope Deno |
| **Backend**  | BE-7  | OpenAI reasoning → effort "low" per CRM  |
| **Backend**  | BE-8  | Supabase ref → NON dfrrigmjsvcsdhgqtikz   |
| **Workflow** | WF-8  | Business date → dateTimezone helper       |
| **Workflow** | WF-9  | Business date UI → smoke cross-timezone   |
| **Workflow** | WF-10 | Fix timezone → sweep consumer date-only   |
| **Workflow** | WF-11 | Full E2E rossa → triage prima, patch dopo |
| **Workflow** | WF-12 | Guardrail shell → non mangiare failure    |
| **Workflow** | WF-13 | Scadenze fiscali weekend → shift business |
| **Dominio**  | DOM-5 | Fiscale due layer → check entrambi        |
| **DB**       | DB-6  | Payload servizi figli → eredita client_id |
| **DB**       | DB-7  | F24 reali → interessi e compensazioni     |
| **DB**       | DB-8  | Builder che unisce services+expenses → skip source_service_id |
| **DB**       | DB-9  | EF marca per id → UNDO smarca per id/FK, mai per string |
| **DB**       | DB-10 | Incasso atteso da emit → riconcilia per FK, mai duplicare |
| **Workflow** | WF-14 | Flow rapidi → dedup guard project+day     |
| **Workflow** | WF-15 | Lavoro rischioso → RAG attivo + review multi-superficie |
| **Workflow** | WF-16 | CI check → `gh -R fork` (default punta a upstream)  |
| **Workflow** | WF-17 | Lavoro anti-frizione UX → RAG + browser desktop E mobile |
| **Workflow** | WF-18 | Mutation che cambia stato derivato → invalida TUTTE le superfici consumanti |
| **Workflow** | WF-19 | E2E/browser/smoke → crea dati demo deterministici + cleanup sistematico (try/finally, 0 leftover) |
| **Workflow** | WF-20 | Assert valuta/numero formattato → grouping-agnostico (Node small-ICU vs browser) |
| **Workflow** | WF-21 | E2E "tool rotto" → MCP browser ≠ Playwright del progetto, NON deferire |
| **Backend**  | BE-9  | EF Calendar timed → usa timestamp service |

---

## UI Triggers

### UI-1: Nuova lista desktop = colonne ridimensionabili

**Quando**: creo/modifico `*ListContent.tsx` con tabella desktop
**Fare**: `useResizableColumns(resource)` + `ResizableHead` + `tableLayout: "fixed"`
**Perché**: tutte le liste CRM supportano resize con localStorage persistence

### UI-2: Nuovo filtro entità = usare FilterPopover

**Quando**: aggiungo filtro dropdown per entità (client, project, supplier...)
**Fare**: `FilterPopover` da `filters/FilterHelpers.tsx`, NON duplicare Popover inline
**Perché**: 6 moduli usavano lo stesso Popover duplicato, ora c'è il generico

### UI-3: Nuova pagina lista → MobilePageTitle

**Quando**: creo/modifico un componente `*List.tsx`
**Fare**: aggiungere `<MobilePageTitle title="..." />` come primo figlio
**Perché**: su mobile non c'è breadcrumb, utente non sa dove è
**Check**: cerco `title={false}` nella lista → devo aggiungere MobilePageTitle

### UI-4: Input numerici React — MAI `?? 0`

**Quando**: vedo `<Input type="number" value={field ?? 0}` o `onChange: "" → 0`
**Fare**: `value={field ?? ""}` e `onChange: "" → null`
**Perché**: l'utente non riesce a cancellare il campo

### UI-5: useEffect + formState = ciclo infinito

**Quando**: vedo `formState` nelle dipendenze di un `useEffect`
**Fare**: rimuoverlo, usare `getFieldState("field")` senza secondo parametro
**Perché**: `formState` cambia ad ogni render → loop infinito garantito

### UI-6: Import da `@/components/admin` → no barrel

**Quando**: vedo import dal barrel file
**Fare**: split in import specifici (`@/components/admin/x`)
**Perché**: previene bundle bloat e circular deps
**Eccezione**: se l'import specifico non esiste (es. `SaveButton` è in `form.tsx`), usare il barrel solo per quello

### UI-7: Componente desktop con props → verificare SEMPRE il mobile

**Quando**: passo nuovi props a un componente condiviso (es. `DashboardKpiCards`, qualsiasi card/widget riusato)
**Fare**: cercare TUTTE le chiamate di quel componente nel codebase (`Grep`) e verificare che i nuovi props siano passati anche da `MobileDashboard`, `Mobile*`, e qualsiasi altro consumer
**Perché**: `MobileDashboard` chiamava `DashboardKpiCards` senza `fiscalKpis` e `taxesPaid` → TASSE mostrava "—" su mobile con dati finanziari SBAGLIATI. Dati finanziari errati = rischio critico per l'utente. MAI lasciare un consumer senza i props necessari.
**Check**: `grep -r "ComponentName" src/ --include="*.tsx"` per trovare tutti i consumer

### UI-8: Nuova superficie AI → pattern card unificata

**Quando**: aggiungo AI a una nuova sezione del prodotto (es. storico, dettaglio)
**Fare**: replicare il pattern `DashboardHistoricalAiCard` / `DashboardAnnualAiSummaryCard`:

1. Vista smart toggle (localStorage key unica)
2. Suggerimenti colorate con `HistoricalSuggestedQuestion` (color + priority + scope)
3. Input libero + Enter submit
4. PDF export via afterprint (`[data-print-portal]`)
5. Compact mode per mobile (collapsible suggestions)
6. Provider con `{ visualMode }` option
7. Edge Function con `visualModeInstructions` condivise

**Perché**: la checklist in AGENTS.md ("AI Visual Blocks Pattern") ha 6 step — questo trigger aggiunge i dettagli UI mancanti (suggerimenti colorate, compact mode, scope selector)

---

## DB Triggers

### UI-9: Estimator/helper form -> mai auto-scrivere campi business con semantica diversa

**Quando**: scrivo o modifico un helper di form (estimator, autocomplete,
picker) che nel suo `onApply` fa piu' `setValue` su piu' campi del form
**Fare**: scrivere SOLO i campi che sono semanticamente la ragione d'essere
del helper. Non "gentilmente" precompilare altri campi dedotti, neanche con
guardia `if (field is empty)`. Se serve un comportamento copia, farlo come
azione esplicita (bottone "Usa destinazione come localita'") che l'utente
clicca coscientemente.
**Perche'**: il 2026-04-15 il TravelEstimator in `ServiceInputs.tsx`
scriveva anche `service.location` con `estimate.generatedLocation` se
location era vuoto. Risultato: per l'utente che mette prima il `location`
reale delle riprese (Taormina) e poi compila i km in un secondo momento,
il campo restava corretto. Ma l'utente che apriva l'estimator PRIMA di
mettere la location vedeva `location` riempito con il punto auto
(Acireale) e poi non lo correggeva. La bozza fattura finiva con il punto
auto al posto del luogo delle riprese, ingannando il cliente. Fix:
rimosso completamente il ramo di auto-scrittura di `location`.

### UI-10: card "quanto mi devono ancora" -> vista canonica `balance_due`, non le righe payment

**Quando**: una card/KPI finanziaria deve mostrare "da incassare / quanto mi
devono / credito residuo" e sto per derivarla dalle righe `payments` (es.
`status != 'ricevuto'`) o da un ricalcolo locale
**Fare**: leggere la vista canonica cassa-aware `client_commercial_position.balance_due`
(o `project_financials.balance_due`), che e' `lavoro+spese consegnati − incassato
ricevuto`, e sommare `Σ max(0, balance_due)` con clamp per-cliente. La card del
credito e' CUMULATIVA (tutti gli anni), non filtrata per anno. Tenere
`pendingPaymentsTotal` per cashflow forecast/scaduti (concetto distinto). Se il
valore alimenta anche l'AI, passare lo STESSO totale al contesto (no seconda
verita') con un controllore falsificabile che lega card e AI alla stessa fonte.
**Perche'**: il 2026-06-19 (QW2) la card "Da incassare" derivava da
`pendingPaymentsTotal` (solo le poche righe payment "attese" inserite a mano):
mostrava 375 mentre il credito reale era ~7.131. L'utente registra il lavoro
(`services`) e poi incassa, raramente crea una riga payment attesa per ogni
lavoro -> il lavoro consegnato-non-incassato era INVISIBILE. La vista
`client_commercial_position` cattura anche il residuo no-project. Vale anche per
qualunque card "owed/receivable": la fonte e' il modello di dominio, non le righe
transazionali parziali (cugino di DOM-4: stato semantico != conteggio righe).

---

### DB-1: Enum/Choice = aggiorna TUTTE le superfici

**Quando**: aggiungo un valore a un enum (expense_type, service_type, status...)
**Fare**: aggiornare CHECK constraint DB, types.ts, UI choices/labels, views con CASE, AI registry, Edge Functions, test
**Perché**: commit a33d903 aggiunse 3 expense types nel frontend ma NON nel CHECK → INSERT bloccati per settimane

### DB-2: Nuova migration SQL → checklist

**Quando**: creo `supabase/migrations/YYYYMMDDHHMMSS_*.sql`
**Fare**: verificare:
- `IF EXISTS` / `IF NOT EXISTS` per replayability
- RLS policies se tabella nuova
- Indici su FK
- Trigger `updated_at` se serve

### DB-3: km su servizi = spesa auto dal trigger DB

**Quando**: codice che inserisce servizi con km_distance > 0
**Fare**: NON creare manualmente spesa spostamento_km — il trigger `sync_service_km_expense` la crea via `source_service_id`
**Perché**: doppio conteggio. `quickEpisodePersistence` e `invoice_import` NON devono creare spese km

### DB-4: View con shape ridotta = DROP prima di ricreare

**Quando**: riscrivo una view rimuovendo o rinominando colonne esistenti
**Fare**: usare `DROP VIEW IF EXISTS ...` seguito da `CREATE VIEW ...`; non usare `CREATE OR REPLACE VIEW` se il nuovo schema ha meno colonne. Verificare prima eventuali dipendenze e ricrearle nella stessa migration se servono.
**Perché**: Postgres non permette di eliminare colonne da una view con `OR REPLACE` (`ERROR: cannot drop columns from view`). Il bug ha rotto `supabase db reset` sulla migration `20260401094930_single_source_financials.sql`, quindi ha violato la replayability.

### DB-5: Sposto un invariant dal frontend al DB trigger = audit duplicati orfani

**Quando**: una logica che prima creava record dal client viene spostata in un trigger DB (es. `services` -> `expenses.spostamento_km`)
**Fare**: auditare subito le righe create durante la finestra di transizione cercando gruppi con stessa chiave naturale ma mix di record linked/unlinked (`source_service_id` presente + assente). Pulire gli orfani prima di fidarsi dei nuovi totali.
**Perché**: il 2026-03-06 `QuickEpisode` creava ancora manualmente la spesa km mentre il trigger `sync_service_km_expense` la creava gia' dal `service`. Risultato: doppio conteggio, progetto/cliente gonfiati di `€ 40,54` finche' non e' stato rimosso l'orfano.

### DB-6: Payload builder di record figli -> eredita SEMPRE client_id dal progetto

**Quando**: scrivo un builder che costruisce un `create` payload per una entita' figlia del progetto (services, expenses, payments, quotes, tasks, ...) e il tipo del record figlio ha una FK diretta a `clients` oltre a quella a `projects`
**Fare**: popolare ENTRAMBI gli FK. Se il builder riceve `record: Pick<Project, "id" | "client_id">` (o tipo equivalente), passare sia `project_id: record.id` sia `client_id: record.client_id`. Il test unitario del builder DEVE asserire entrambe le FK nel payload atteso.
**Perché**: il 2026-04-14 `buildQuickEpisodeServiceCreateData` passava solo `project_id`, creando un servizio orfano (`client_id` NULL). Risultato: duplicato visibile in `Registro Lavori`, client filter rotto, rischio su dashboard fiscali/commerciali. Il peer builder `buildQuickEpisodeExpenseCreateData` lo faceva correttamente — l'asimmetria e' il segnale d'allarme da cercare durante code review.

### DB-7: F24 reali con interessi o credito compensato -> non forzare il modello vecchio

**Quando**: riconcilio quietanze AdE/F24 reali e vedo righe di interessi
rateazione (`1668`, `DPPI`) oppure un saldo delega piu' basso della somma delle
righe positive per via di un credito in compensazione
**Fare**:
- estendere il modello, non piegare i dati reali dentro campi sbagliati
- gli interessi vanno in componenti dedicate (`interessi_erario`,
  `interessi_inps`)
- il credito compensato vive sulla submission F24 (`compensation_credit`), non
  come payment line negativa
- in UI la formula canonica della quietanza e': `sum(payment_lines.amount) -
  compensation_credit`
**Perché**: il modello v1 del fiscal reality layer ammetteva solo capitale
positivo su obligations/payment_lines. Senza estensione schema si finisce a
gonfiare importi INPS/Erario o a inventare righe negative impossibili, e il
gestionale smette di rappresentare i quietanze AdE 1:1.

### DB-8: Builder/reader che unisce services e expenses -> filtrare `source_service_id`

**Quando**: scrivo una funzione che legge sia `services` sia `expenses` sullo
stesso progetto/cliente e ne deriva righe output (invoice draft builder,
export, report, aggregatore AI, schermata di dettaglio cliente)
**Fare**: nel filtro sulle `expenses` escludere SEMPRE le righe con
`source_service_id != null`. Quelle sono generate dal trigger DB
`sync_service_km_expense` a partire dal service corrispondente e sono
gia' rappresentate dalla riga "Rimborso chilometrico" del service. Il check
va sopra il calcolo `amount`, non dentro. Aggiungere test di regressione
con un service km + l'expense auto generata, e asserire che la riga km
appaia esattamente 1 volta.
**Perché**: il 2026-04-15 `buildInvoiceDraftFromProject` e
`buildInvoiceDraftFromClient` generavano per la stessa trasferta sia una
riga "Rimborso chilometrico" (da `service.km_distance`) sia una riga
"Spesa: Spostamento" (da `expense.spostamento_km` creata dal trigger DB).
Ogni km veniva contato due volte nella bozza fattura, gonfiando il
netto a pagare e rischiando fatture reali emesse con importi sbagliati.
Questo pattern si ripete ogni volta che qualcuno sposta un invariant in un
DB trigger senza aggiornare i consumer downstream (vedi anche DB-5).

### DB-9: un'azione che MARCA record per id -> la sua UNDO deve SMARCARE per id/FK, mai per stringa libera

**Quando**: scrivo o modifico una coppia mark/un-mark (emit/void, link/unlink,
assegna/revoca) dove l'azione "mark" agisce su `id IN (...)` ma l'UNDO deriva il
set da una colonna **free-text** (`invoice_ref`, codice, label) con `WHERE
field = <valore>`
**Fare**: rendere l'un-mark SIMMETRICO al mark. Persistere il legame con una FK
dedicata (es. `financial_document_id` su `services`/`expenses`, popolata dall'EF
che marca) e smarcare per quella FK (`WHERE financial_document_id = <docId>`),
azzerando anche la free-text. Mai smarcare per la stringa libera: e' editabile
dall'utente e scritta da writer storici/import, quindi l'UNDO colpirebbe righe
omonime estranee (corruzione dato). Niente backfill cieco per stringa: se in prod
non esistono righe legacy del nuovo flow (verificare con una query, es.
`payments_linked=0`), la FK parte NULL su tutto lo storico e l'UNDO non lo tocca.
Aggiungere un controllore che dimostra che una riga omonima con la stessa stringa
ma FK NULL NON viene toccata.
**Perche'**: il 2026-06-17 `invoice_void` smarcava per `invoice_ref =
document_number AND client_id`. `invoice_ref` e' free-text (`ServiceInputs`) e
portato da import storici (`FPR n/23`): un void poteva riportare a "Da fatturare"
lavori/spese storici estranei, e il twin-guard per `document_number` (senza
`issue_date`, mentre la UNIQUE lo include) dava falso-409 su `1/2024`+`1/2025`.
Fix: FK `financial_document_id` simmetrica all'emit, twin-guard rimosso. Stesso
spirito di DB-5/DB-8: spostare un invariant senza rendere simmetrico il rovescio
e' la causa radice.

### DB-10: un incasso ATTESO creato da emit (in_attesa + financial_document_id) -> riconcilia per FK, non duplicare

**Quando**: tocco un flusso che registra un incasso reale (`QuickPaymentDialog`,
`/payments/create`, quote/client payment) o che emette/registra una fattura
(`invoice_emit`) su un progetto/cliente che puo' gia' avere un `payment`
`in_attesa` legato a un documento (`financial_document_id`)
**Fare**: PRIMA di `create`, cercare l'atteso collegato e RICONCILIARE invece di
inserire:
- incasso reale -> SETTLE in place la riga collegata (`status='ricevuto'`,
  `payment_date` reale via `todayISODate()` MAI null/futuro, cassa DOM-1/WF-8),
  non un secondo payment; >1 collegato = `ambiguous`, CHIEDI quale (mai indovinare);
- emit con atteso MANUALE pre-esistente (FK NULL, stesso amount±cent + tipo
  assorbibile + stesso project) -> ASSORBI (`UPDATE ... SET financial_document_id
  WHERE financial_document_id IS NULL` + count-guard fail-closed, `FOR UPDATE`);
  client-level senza scope project = `create` (out-of-scope v1);
- gate `payment_type`: salda/assorbi SOLO `saldo/acconto/parziale`, MAI `rimborso*`
  (corromperebbe importo fattura + cassa). La Set assorbibile va tenuta SIMMETRICA
  tra runtime client (`quickPaymentReconciliation.ts`) e Deno
  (`_shared/invoiceEmit.ts`);
- decider PURO testabile (`settle|create|ambiguous`, `absorb|create|ambiguous`)
  sul pattern `decideEmittedPaymentReconciliation`; il bersaglio e'
  `pendingPaymentsTotal` ("Da incassare", `status != 'ricevuto'`), NON `balance_due`
  (conta solo `ricevuto`); controllore e2e con DELTA (robusto al seed) + RTL che
  asserisce `update` non `create` e lock cassa-year a clock congelato (WF-9).
**Perche'**: il 2026-06-17 `QuickPaymentDialog` faceva sempre `create` senza
`financial_document_id` e `invoice_emit` creava sempre un nuovo `in_attesa` →
l'atteso emesso restava orfano e il manuale veniva duplicato → "Da incassare"
contava lo stesso dovuto due volte. Stesso spirito di DB-5/DB-8/DB-9: una fonte
unica (`financial_document_id`) va riusata simmetricamente in tutti i consumer,
non reinventata. Limite v1 noto: `invoice_void` cancella l'atteso assorbito (no
ripristino) — documentato in spec.

---

## Backend Triggers

### BE-1: Edge Function modificata → deploy manuale

**Quando**: tocco codice in `supabase/functions/`
**Fare**: ricordare che `git push` NON basta, serve `npx supabase functions deploy`
**Perché**: altrimenti resta la vecchia versione in produzione

### BE-2: Nuova Edge Function → config.toml!

**Quando**: creo una NUOVA Edge Function
**Fare**: aggiungere IMMEDIATAMENTE in `supabase/config.toml`:
```toml
[functions.nome_funzione]
verify_jwt = false
```
**Perché**: l'auth è gestita internamente da `_shared/authentication.ts`. Senza la entry, Kong blocca il JWT → 401 sistematico su OGNI chiamata.
**Bug reale**: `invoice_import_confirm` ha dato 401 per settimane.
**Check**: `grep "functions.nome_funzione" supabase/config.toml`

### BE-3: Schema change → riavviare edge runtime

**Quando**: dopo migration che cambia tipo colonna o aggiunge colonna
**Fare**: `docker restart supabase_edge_runtime_gestionale-rosario`
**Perché**: l'edge runtime usa lo schema della sessione, senza restart usa il vecchio

### BE-4: Deduplica servizi → includere description

**Quando**: vedo query di deduplicazione in `invoice_import_confirm`
**Fare**: verificare che `description` sia nel WHERE
**Perché**: spot diversi stessa data/fee (es. 2 spot Gustare €312) visti come duplicati senza description

### BE-5: EF env vars → stop+start, NON docker restart

**Quando**: aggiungo/modifico variabili in `supabase/functions/.env`
**Fare**: `npx supabase stop --no-backup && npx supabase start` — MAI solo `docker restart`
**Perché**: `docker restart` riavvia il container con le STESSE env vars dell'avvio originale. Solo `supabase stop+start` rilegge `functions/.env` e le passa al container.

### BE-6: Reload dati remoti → TRUNCATE prima di load

**Quando**: dopo `supabase start` o `supabase db reset` devo caricare dati remoti
**Fare**: TRUNCATE tutte le tabelle (auth + public + storage) con `session_replication_role = replica` PRIMA di `psql -f dump.sql`
**Perché**: la migration `20260302170000_domain_data_snapshot.sql` carica dati che collidono col dump remoto → errori "duplicate key". Sequenza: truncate → load dump → `npm run local:admin:bootstrap`

### BE-7: OpenAI reasoning → effort "low" per unified_crm_answer

**Quando**: tocco il parametro `reasoning` nella Edge Function `unified_crm_answer`
**Fare**: MAI usare `effort: "medium"` — il contesto CRM completo è troppo grande e il modello esaurisce i token nel ragionamento, producendo output vuoto (502). Usare `effort: "low"`. Le altre EF (annual, historical, cash inflow) possono tenere "medium" perché il loro contesto è pre-aggregato e piccolo.
**Perché**: gpt-5.2 e gpt-5-mini con reasoning medium + snapshot CRM intero → 20-30s di thinking → output_text vuoto → 502

### BE-8: Supabase project ref → NON usare il vecchio

**Quando**: deployo Edge Functions con `npx supabase functions deploy`
**Fare**: usare `--project-ref qvdmzhyzpyaveniirsmo`, NON il vecchio `dfrrigmjsvcsdhgqtikz`
**Perché**: il progetto è stato ricreato, il vecchio ref dà 403

### BE-9: google_calendar_sync timed event → usa i timestamp reali del service

**Quando**: tocco `buildCalendarEvent` in `supabase/functions/google_calendar_sync/index.ts` oppure qualsiasi EF che converte record del CRM in eventi Google Calendar timed (non all-day)
**Fare**: passare `service.service_date` e `service.service_end` VERBATIM come `dateTime` RFC3339 (i timestamp DB sono gia' `timestamp with time zone`, portano l'offset UTC, Google li parsa direttamente). MAI fare `service_date.slice(0,10)` per poi concatenare un orario hardcoded tipo `T09:00:00`. Se `service_end` e' null ma `all_day` e' false, fallback a `service_date + 1h` (non al giorno successivo e non a un default globale) per avere un range valido non degenere.
**Perché**: il 2026-04-14 `buildCalendarEvent` aveva un TODO non chiuso ("Timed event: default 09:00–18:00") che prendeva solo la parte-data dei timestamp e concatenava `T09:00:00` / `T18:00:00`. Risultato: ogni evento timed sincronizzato su Google Calendar mostrava 09:00-18:00 invece degli orari reali inseriti dall'utente (es. 08:30-14:30 per "Savoca - Bar Vitelli"). Gli orari reali erano gia' presenti nel DB e nel form — il bug era solo nella serializzazione verso Google.

### WF-7: Dopo push → controlla CI autonomamente

**Quando**: ho appena fatto `git push`
**Fare**: SEMPRE controllare il CI con `gh run list --limit 1` + `gh run view <id> --log-failed` SENZA aspettare che l'utente mandi screenshot. Se fallisce, fixare e re-pushare autonomamente.
**Perché**: l'utente non deve fare da intermediario tra me e il CI. Devo controllare i log da solo, ogni volta, subito dopo il push.

### WF-8: Business date = dateTimezone helper, mai toISOString().slice

**Quando**: scrivo `new Date().toISOString().slice(0,10)` o
`.toISOString().split("T")[0]` per ottenere una data di business, oppure
`new Date("YYYY-MM-DD")` per parsare una data di business
**Fare**: usare `todayISODate()` o `toISODate(date)` dal modulo
`dateTimezone` (`src/lib/dateTimezone.ts` client, `_shared/dateTimezone.ts` EF).
Mai convertire una business date string in `Date` senza semantica esplicita.
**Perché**: `toISOString()` converte in UTC prima di estrarre — data
sbagliata tra 00:00 e 02:00 CEST. `new Date("YYYY-MM-DD")` interpreta come
UTC midnight — giorno sbagliato in `Europe/Rome` nella stessa finestra.

---

## Dominio Triggers

### DOM-1: Modello fiscale = CASSA, non competenza

**Quando**: vedo calcolo base imponibile forfettaria
**Fare**: verificare che usi `payments` (status=ricevuto, payment_date), NON `services` (service_date)
**Perché**: regime forfettario = principio di cassa (Art. 1 commi 54-89, L. 190/2014)

### DOM-2: Forfettario ≠ regime ordinario

**Quando**: propongo feature fiscali (deducibilità, IVA, costi deducibili)
**Fare**: FERMARMI e verificare se ha senso nel forfettario
**Perché**: nel forfettario le spese NON si deducono individualmente — il coefficiente di redditività le assorbe. No IVA, no deduzioni singole.

### DOM-3: FatturaPA XML → schema XSD + Aruba

**Quando**: tocco la generazione XML FatturaPA (`invoiceDraftXml.ts`)
**Fare**: verificare conformità allo schema XSD FPR12 v1.2.3 e compatibilità col flusso Aruba PEC. I campi critici sono: DatiTrasmissione (CF intermediario Aruba), CedentePrestatore (RF19), DettaglioLinee (IVA 0% N2.2), DatiPagamento (MP05 bonifico). Bollo escluso dall'XML (gestito da Aruba).
**Perché**: Aruba scarta silenziosamente XML non conformi allo schema, senza dare errori chiari. Un campo mancante o malformato blocca l'invio della fattura.

### DOM-7: FatturaPA `String*LatinType` accetta solo Latin-1 — sanitize SEMPRE

**Quando**: genero, modifico o testo la generazione del XML FatturaPA
(`invoiceDraftXml.ts` o qualsiasi EF/helper che emette `<Descrizione>`,
`<Causale>`, `<Denominazione>`, `<Indirizzo>`, ecc.)
**Fare**: applicare `sanitizeLatinForFatturaPA()` a ogni stringa prima di
inserirla nel tag (gia' fatto dentro `esc()` nel builder). Il tipo XSD
`String*LatinType` ha pattern `[\x00-\x7F\xA0-\xFF]*` — SdI e Aruba PEC
rifiutano silenziosamente il file se compare anche un solo code point
fuori range. I caratteri piu' pericolosi sono:
- `€` (U+20AC) -> deve diventare `EUR`
- `–` (en-dash U+2013) / `—` (em-dash U+2014) -> `-`
- `'` `'` `"` `"` (smart quotes) -> `'` `"`
- `…` (U+2026) -> `...`
- caratteri CJK, emoji, ogni altro non-Latin-1 -> stripped
I middledot `·` (U+00B7) e il multiplication sign `×` (U+00D7) sono
**in** Latin-1 e possono restare.
**Perche'**: il 2026-04-15 una fattura reale su Aruba e' stata rigettata
perche' le descrizioni dei rimborsi km contenevano sia `€0,25/km` sia
`Valguarnera – Acireale`. L'errore Aruba e': `'Descrizione' ... is
invalid according to 'String1000LatinType' - The Pattern constraint
failed`. Tutte le nuove Edge Functions / helper che scrivono XML devono
passare dalle stesse utility — duplicare la logica di sanitize e'
vietato.

### DOM-4: Stato semantico di dominio ≠ lunghezza array UI

**Quando**: una vista deriva uno stato business (es. primo anno, step workflow, completezza) da condizioni tipo `items.length === 0`
**Fare**: verificare se il dominio ha elementi "sempre presenti" o low-priority filler; se sì, introdurre un flag esplicito nel modello (`isFirstYear`, `isDegraded`, ecc.) e usare quello nella UI
**Perché**: nel refactor fiscale 2026-04-02 le low-priority deadlines (bollo/dichiarazione) esistono sempre, quindi `deadlines.length === 0` non può più significare "primo anno". La UI avrebbe mostrato semantica falsa pur con calcolo corretto.

### DOM-5: Fiscale due layer → check entrambi

**Quando**: aggiungo feature fiscali, modifico deadline, dashboard o promemoria
**Fare**: verificare ENTRAMBI i layer: 1) stima (fiscalModel, fiscalDeadlines) 2) realtà (fiscal_declarations, fiscal_obligations, F24). Un consumer deve usare `buildFiscalRealityAwareSchedule()` per il merge, MAI riscrivere la logica inline. Se tocco il layer stima, verificare che il read model produce output coerente. Se tocco il layer realtà, verificare che il fallback estimated funzioni ancora.
**Perché**: il sistema ha 2 fonti fiscali — stime CRM e dati reali dal commercialista. Se una feature legge solo una delle due, mostra dati parziali o contraddittori. Phase 1 ha anche un'inconsistenza nota: dashboard mostra obblighi reali, promemoria automatici usano ancora le stime (Phase 2 follow-up).

### DOM-8: forfettario — 3 numeri INPS DISTINTI, formula standard giusta, data-fattura vs cassa

**Quando**: tocco il calcolo fiscale forfettario (INPS Gestione Separata, imposta sostitutiva), `buildFiscalYearEstimate`, `fiscalFormula.ts`, o leggo/scrivo `fiscal_declarations.total_inps`
**Fare**:
- la formula forfettaria STANDARD è corretta e replica il commercialista al centesimo (verificato su dichiarazioni AdE reali: 2023 imposta 429/INPS 2.249; 2024 imposta 233/INPS 1.879). Non "calibrare su aliquota effettiva": serve solo la formula giusta coi dati giusti.
- NON confondere i 3 numeri INPS: **competenza** (`reddito_lordo × aliquota_GS`, RR "contributo dovuto", = output stima); **versato-cassa** (LM035, INPS pagato nell'anno via F24, = ciò che DEDUCE l'imposta — `inps_saldo/acconto_1/acconto_2`, allowlist, escludi `interessi_inps`, filtra per `submission_date`); **`total_inps` in `fiscal_declarations`** (totale ciclo riconciliato acconti+saldo — dato reale del commercialista, NON ricalcolare/UPDATE).
- aliquota GS storicizzata: hardcoda SOLO gli anni VERIFICATI dalle dichiarazioni reali (2023=26,23%, 2024=26,07%); anni non chiusi (2025+) → `fiscalConfig.aliquotaINPS` (non inventare).
- attribuzione ricavi: il commercialista usa **data fattura** (competenza), il gestionale `payments.payment_date` (cassa). Sulle fatture a cavallo d'anno divergono (es. Gustare FPR 10/23 emessa 29/12/2023, incassata 30/01/2024). Per predire il commercialista serve `financial_documents.issue_date` — inerte finché BR2 non collega i documenti.
- **card anno CHIUSO (D3)**: mostra il DEFINITIVO, non la stima. L'INPS "dell'anno" da mostrare = **competenza** = `total_inps − prior_advances_inps` (= `inps_saldo`, stessa derivazione di `buildObligationsFromDeclaration`; verificato prod 2023→2249, 2024→1879), NON `total_inps` (ciclo). Imposta = `total_substitute_tax` (2023→429, 2024→233). Chiuso = `total_substitute_tax + total_inps > 0` (2025 zero → resta stima). Helper puro `applyDefinitiveDeclaration`; override SOLO in `buildFiscalModel` (client+UI), MAI nella formula condivisa client/EF (così `fiscalParity.test.ts` resta verde). Flag onesto `FiscalKpis.isDefinitive` + pill `Definitivo`/`Stima` (INV-6), parita' desktop/mobile (UI-7).
**Perché**: il 2026-06-19, senza le dichiarazioni reali, il `total_inps` 3.667 sembrava un bug (vs 1.879). Stavo per fare un UPDATE distruttivo che avrebbe rotto la riconciliazione F24. Le dichiarazioni AdE reali (SPID) hanno chiarito: formula giusta, 3 numeri distinti, dato reale intoccabile. Vedi `docs/superpowers/specs/2026-06-19-fiscal-estimate-calibration-design.md` §14 e memoria `project_fiscal_real_data_baseline.md`.

---

## Config Triggers

### CFG-1: Nuova configurazione → 3 file obbligatori

**Quando**: aggiungo un campo a `ConfigurationContextValue`
**Fare**:
1. `defaultConfiguration.ts`
2. `SettingsPage.tsx`
3. `docs/architecture.md` sezione Settings

### CFG-2: BusinessProfile → merge defaults safe

**Quando**: modifico `businessProfile` in `defaultConfiguration.ts` o nel merge logic di Settings
**Fare**: verificare che il merge config→defaults non sovrascriva campi utente con valori vuoti. Il pattern corretto e' deep merge con fallback: ogni campo usa il valore salvato se presente, altrimenti il default. MAI sostituire l'intero oggetto.
**Perché**: un merge naive ha cancellato i dati emittente (P.IVA, IBAN) salvati dall'utente, facendo generare PDF preventivo/bozza fattura senza dati fiscali.

### CFG-4: Edge Functions in repo misto -> scope Deno

**Quando**: in un repo React/Vite apro o aggiungo file in `supabase/functions/**`
e l'editor segnala errori falsi su `jsr:` o `Deno`
**Fare**: configurare il workspace per Deno SOLO su quel path:
`supabase/functions/deno.json` + `.vscode/settings.json` con
`deno.enablePaths: ["supabase/functions"]` + `deno.config`. Se manca,
raccomandare anche `denoland.vscode-deno`.
**Perché**: le Edge Functions Supabase sono Deno-native. Senza scope dedicato,
VS Code le tratta come TS frontend standard e mostra errori inesistenti
(`Cannot find module 'jsr:...'`, `Cannot find name 'Deno'`). La correzione
giusta è di tooling, non un workaround con tipi finti o import riscritti.

### CFG-3: Flag/prop root -> verificare consumo reale

**Quando**: aggiungo o uso una prop/flag di controllo a livello root (telemetry, feature flag, disable/enable behavior)
**Fare**: verificare che la stessa prop venga consumata nel layer che produce davvero l'effetto e che non venga solo inoltrata a un figlio diverso. Se c'e' un wrapper (`App` -> `CRM` -> `Admin`), controllare TUTTI i passaggi.
**Perché**: `disableTelemetry` era gia' forzato sul componente `Admin`, ma il beacon custom viveva in `CRM.tsx` e continuava a partire. Il flag sembrava attivo, ma non lo era nel punto che contava.

---

## Workflow Triggers

### WF-1: Aggiorno development-continuity-map.md → aggiorna indice

**Quando**: aggiungo `## Update`, Structural Section o Changelog
**Fare**: aggiornare Navigation Map in cima + `Last updated:`
**Perché**: senza indice, il documento da 1100+ righe è innavigabile

### WF-2: prettier drift su .ts/.tsx — causa radice RISOLTA (2026-06-17)

**Quando**: vedo il check `Prettier` CI rosso o `npm run prettier` con `[warn]` su file `.ts/.tsx`
**Fare**: NON inseguire i singoli file a mano. Il sistema ora previene il drift alla radice:
- `.lintstagedrc` esegue `prettier --write` ANCHE su `*.{js,jsx,mjs,ts,tsx}` (era solo `eslint --fix` → i TS non venivano mai formattati al commit);
- CI `check.yml` ha uno step `npm run prettier` BLOCCANTE (prima era `lint-action` continue-on-error → drift silenzioso);
- se serve azzerare drift residuo: `npm run prettier:apply` (write) + verifica `npm run prettier` (check).
**Perché**: per mesi i file TS sono driftati perché lint-staged li passava solo a `eslint --fix`, mentre il CI faceva `prettier --check` sui .ts → mismatch sistematico, mascherato dal check CI non-bloccante. Fix provato con probe TS prettier-dirty (lint-staged ora lo formatta). Dettagli canonici in `docs/development-continuity-map.md` (sezione "Tooling: formatting & lint enforcement").

### WF-3: Destructuring param → verificare completezza

**Quando**: aggiungo parametro opzionale a funzione con destructuring
**Fare**: verificare che sia presente ANCHE nella destrutturazione, non solo nel tipo
**Perché**: `buildUnifiedCrmReadContext` aveva `suppliers?` nel tipo ma mancava nella destrutturazione → ReferenceError

### WF-4: Aggiorno file di sistema → sweep incrociata OBBLIGATORIA

**Quando**: modifico uno qualsiasi tra: `memory/*.md`, `.claude/rules/learning.md`, `CLAUDE.md`, `.claude/rules/*.md`
**Fare**: PRIMA di dichiarare "fatto", verificare che TUTTI gli altri file di sistema siano coerenti:
- Riferimenti a file: esistono ancora? path corretto?
- Formati descritti nelle istruzioni: corrispondono al formato reale del file?

### WF-5: E2E test → validano il sistema, non si adattano

**Quando**: un E2E test fallisce dopo un mio cambiamento
**Fare**: verificare PRIMA se il sistema produce il valore corretto (query DB, screenshot). Se sì, il test era sbagliato — correggi il test. Se no, il mio codice ha un bug — correggi il codice.
**Perché**: i test servono a verificare il sistema corretto. Adattare i test per farli passare senza capire la causa nasconde bug reali (es. calculations.smoke aspettava 644€ ma il sistema produceva correttamente 653,50€ da sempre).

### WF-6: Commit codice → docs+memoria NELLO STESSO commit

**Quando**: sto per eseguire `git commit` su codice prodotto
**Fare**: PRIMA di committare, verificare se servono aggiornamenti a `docs/`, `memory/*.md`, `.claude/rules/learning.md`. Se si', includerli nello STESSO `git add` + `git commit`. MAI fare prima il commit di codice e poi un commit separato "docs: align...".
**Perché**: commit separati per docs causano disallineamenti sistematici. L'utente ha dovuto correggermi più volte perché dimenticavo docs/memoria dopo il codice. La regola è ora anche in `.claude/rules/session-workflow.md` (COMMIT GATE).

### WF-11: Full E2E rossa dopo evoluzione UI -> prima triage, poi patch mirata

**Quando**: una full suite E2E fallisce in molti moduli subito dopo cambiamenti UI/label/flow
**Fare**: NON rilanciare la suite intera alla cieca. Prendere 1 fail rappresentativo per modulo, confrontarlo con la UI reale e capire se e' drift della spec (label rinominata, selector ambiguo, flow cambiato, responsive) o bug prodotto. Correggere prima i test obsoleti, poi rilanciare la full suite una sola volta.
**Perché**: evita di bruciare tempo/token su rerun inutili e separa rapidamente regressioni vere da test fragili. Oggi `tasks`, `services`, `payments`, `full-ui-audit` e `ai-annual-real` erano rossi per selector/heading obsoleti, non per regressioni del sistema.

### WF-12: Guardrail shell -> non usare `&& ... || true` per hook critici

**Quando**: scrivo un comando shell in hook/CI che esegue un controllo solo se
un file e' staged o se un `grep -q` fa match
**Fare**: usare `if ...; then controllo; fi` oppure raggruppare i comandi, senza
chiudere con `|| true` che assorbe anche il failure del controllo reale
**Perché**: `.husky/pre-commit` sembrava validare `check-learning-integrity`,
ma il pattern `grep -q ... && node ... || true` lasciava passare comunque i
failure veri dello script

### WF-13: Scadenze fiscali nel weekend -> shift al primo business day

**Quando**: tocco calendarizzazione fiscale, `fiscalDeadlines`,
`buildObligationsFromDeclaration`, `_shared/fiscalDeadlineCalculation` o
inserisco dati reali F24/dichiarazioni
**Fare**: verificare se la data nominale cade di sabato/domenica e usare il
helper condiviso `shiftWeekendToNextBusinessDay()` (client +
`supabase/functions/_shared`). Aggiungere test espliciti sui casi reali.
**Perché**: il calendario fiscale reale non resta al `30/11`/`31/05` se il
giorno e' nel weekend. Dai dati del commercialista: `30/11/2024 -> 02/12/2024`,
`30/11/2025 -> 01/12/2025`, `31/05/2026 -> 01/06/2026`. Senza shift il CRM
mostra scadenze false e disallinea dashboard, F24 registrati e reminder.

### WF-9: Business date UI -> smoke cross-timezone reale

**Quando**: valido una UI che mostra scadenze, "oggi", giorni mancanti o date
di business (`DashboardDeadlineTracker`, badge scaduti, date-only operative)
**Fare**: aggiungere almeno uno smoke che blocca `Date.now()` e gira la stessa
pagina in due timezone browser diverse (`Europe/Rome` e una timezone non-UE,
es. `America/New_York`). Gli assert devono colpire il valore business vero
(data mostrata, delta giorni), non dettagli di layout incidentalmente presenti
o assenti.
**Perché**: un codice che sembra corretto in locale puo' ancora dipendere dal
timezone del browser quando fa `new Date("YYYY-MM-DD")` o formatta date-only.
La prova reale e' "stesso output business in timezone diverse", non "passa nel
mio browser".

### WF-10: Fix timezone -> sweep tutti i consumer del date-only

**Quando**: correggo un modello o helper che produce business-date `YYYY-MM-DD`
o deadline fiscali
**Fare**: grep e verificare ANCHE i consumer che:
- leggono `currentYear` con `new Date().getFullYear()`
- formattano `deadline.date` con `new Date("YYYY-MM-DD")`
- generano `due_date` con `new Date(dateOnly + "T00:00:00").toISOString()`
- esistono in runtime diversi (client + `supabase/functions/_shared`)
**Perché**: sistemare solo il modello non basta. Wrapper UI, card di dettaglio
e Edge Functions possono continuare a slittare su boundary anno/giorno o
scrivere timestamp sbagliati pur usando dati gia' bonificati a monte.

### WF-14: Flow rapidi (quick-create) -> dedup guard project+day PRIMA del save

**Quando**: aggiungo o tocco un flow di creazione rapida che bypassa la
ServiceCreate/ExpenseCreate standard (es. `QuickEpisodeDialog`, dialog bulk,
launcher AI, azione Pareto) e insertsce un record figlio su un progetto
**Fare**: prima del `create`, interrogare il dataProvider con un filtro
`project_id + service_date@gte/@lte` (business day Europe/Rome via
`startOfBusinessDayISOString`/`endOfBusinessDayISOString`). Se ci sono match,
chiedere `window.confirm()` con descrizione del record gia' esistente. Il
builder del messaggio deve essere una funzione pura testata a parte, il check
e' async e testato contro un mock `dataProvider.getList`.
**Perché**: il 2026-04-14 un `QuickEpisodeDialog` senza dedup guard ha creato
silenziosamente il duplicato `acc079b0` sullo stesso progetto/data del service
`ed62a7bc`. La ServiceList non aveva segnali visibili in fase di creazione, il
rilevamento e' arrivato solo dopo che l'utente lo ha visto in lista. I flow
rapidi saltano la review lunga del ServiceCreate e quindi hanno bisogno di un
guard esplicito server-side.

### WF-15: Lavoro rischioso/cross-file -> RAG attivo + review multi-superficie

**Quando**: sto per scrivere spec, piano o review, o sto per modificare DB,
schema, RLS, migration, fiscalita, fatture, pagamenti, spese, dashboard, AI, o
qualunque cosa cross-file/ad alto rischio
**Fare**:
1. interrogare ATTIVAMENTE il RAG DeepWiki locale PRIMA di spec/piano/review
   (curl `http://localhost:8001/chat/completions/stream`, `model: gemini-2.5-pro`,
   `repo_url` = snapshot corrente), poi verificare OGNI claim sul sorgente reale;
2. fare le review MULTI-SUPERFICIE e MULTI-COMPETENZA con piu' revisori
   specializzati (DB/Postgres, dominio fiscale forfettario, frontend/superfici +
   mobile parity, provider/backend/Edge, TDD/controllori), e OGNI revisore deve
   usare il RAG.
**Perché**: il 2026-06-14 ho fatto una review mono-superficie senza RAG per
risparmiare token; l'utente ha imposto il contrario. La ricerca semantica trova
superfici nascoste (consumer, registry, helper, cascate, lifecycle) che grep da
solo perde. Saltarla per risparmiare token e' la causa radice degli errori
cross-file. Il guardrail e' anche eseguibile come hook `UserPromptSubmit` in
`.claude/settings.json` (inietta il mandato a ogni turno).

### WF-16: CI check -> usare `gh -R rosariodavidefurnari/gestionale-rosario`

**Quando**: dopo un `git push`, controllo il CI con `gh run list` / `gh run view`
/ `gh api`
**Fare**: passare SEMPRE `-R rosariodavidefurnari/gestionale-rosario` (il fork
reale, = `origin`). `gh` senza `-R` risolve il repo dal contesto e su questo
clone sceglie `upstream` = `marmelab/atomic-crm` (l'upstream Atomic CRM), non il
fork. Per le API: `gh api repos/rosariodavidefurnari/gestionale-rosario/...`.
**Perché**: il 2026-06-16, dopo aver pushato QW1 su `origin`
(`rosariodavidefurnari/gestionale-rosario`), `gh run list` mostrava solo run
`pull_request` di `marmelab/atomic-crm` e nessun run per il mio commit ->
sembrava che il push non avesse triggerato CI. In realta' il push era andato a
buon fine e il run `Check | push | success` esisteva sul fork. Il remote
`upstream` -> marmelab confonde tutti i comandi `gh` privi di `-R`.

### WF-17: Lavoro anti-frizione UX -> RAG + visione browser desktop E mobile

**Quando**: sto lavorando per ridurre la frizione d'uso del gestionale (nuove
azioni, badge, navigazione, cambio stati, flussi cross-superficie) o comunque
qualsiasi modifica che cambia cosa vede/fa l'utente nelle pagine
**Fare**: oltre a RAG + verifica sorgente, NON dichiarare "fatto" senza aver
guardato l'interfaccia REALE nel browser in DUE viewport: desktop E cellulare
(`set_viewport mobile` o lo strumento glance/playwright). Cliccare il flusso
vero (navigazione, apertura dialog, toggle) — non solo leggere lo snapshot — e
verificare che l'azione esista, sia raggiungibile e leggibile su entrambe le
dimensioni, con 0 errori console. La prova della frizione e' "lo vedo e ci
clicco su desktop e mobile", non "passa il typecheck".
**Perché**: l'obiettivo dichiarato dall'utente (2026-06-17) e' ELIMINARE la
frizione d'uso; un fix puo' passare tsc/test/review ed essere comunque scomodo o
nascosto (CTA fuori viewport mobile, dead-end silenzioso, badge illeggibile).
Solo la visione browser su entrambe le viewport lo dimostra. L'utente ha imposto
esplicitamente: "costringiti a usare RAG e visione dell'interfaccia da browser
(desktop e cellulare)".

### WF-18: una mutation che cambia stato derivato -> invalida TUTTE le superfici consumanti (simmetrico al create)

**Quando**: aggiungo/modifico un flow che MUTA dati da cui altre superfici cached
derivano stato (es. void/delete di una fattura -> services "Fatturato", dashboard
"Da incassare", ProjectShow balance), specie se il path "create" gemello fa gia'
un refresh.
**Fare**: dopo la mutation invalidare TUTTE le query consumanti
(`queryClient.invalidateQueries({queryKey:[resource]})` per ogni risorsa
derivata), simmetrico a cio' che fa il create. Estrarre l'elenco in una funzione
pura testabile e scrivere un controllore FALSIFICABILE (rimuovere una risorsa ->
test rosso). ATTENZIONE: NON invalidare il getOne di un record CANCELLATO (rifetch
-> ra-data-postgrest "Cannot coerce to single JSON object"); per le liste usare un
predicate `queryKey[1]==='getList'`. Il controllore e2e desktop NON basta:
`DesktopAdmin` usa `staleTime:0` (rifetcha sempre, falso negativo); la regressione
stale vive su `MobileAdmin` (`staleTime 2min` + `offlineFirst`, CRM.tsx) -> il
controllore deve girare li' o essere un unit test sul QueryClient.
**Perche'**: il 2026-06-17 avevo tolto `refresh()` da `handleVoid` (per killare un
console-error sul getOne del doc cancellato), lasciando ServiceList/dashboard
stale fino a 2 min su mobile. Un test desktop passava comunque (staleTime 0):
falso negativo che viola EXECUTABLE GUARDRAILS. Fix: `invalidateVoidedInvoiceSurfaces`
puro + unit test falsificabile (`voidInvoiceSurfaces.test.ts`).

### WF-19: E2E / browser / smoke che richiede uno stato dati -> crea dati demo deterministici e PULISCILI sistematicamente

**Quando**: un test e2e, uno smoke (locale o prod) o una verifica browser WF-17
ha bisogno di uno stato che non esiste nel dataset (es. un `payment` `in_attesa`
con `financial_document_id`, una fattura emessa, un progetto con una certa
condizione)
**Fare**: NON appoggiarsi a dati reali del dominio e NON lasciare residui. Pattern
obbligatorio:
- **Setup** deterministico e idempotente, con marker riconoscibile (es.
  `DEMO-<scope>-<ts>`): crea le entita' usa-e-getta necessarie (rispettando gli
  invarianti: es. `km_distance:0` per non innescare il trigger km, `client_type`/
  `category` NOT NULL, ecc.). Usa il Supabase LOCALE per la creazione; su PROD solo
  letture (mai creare dati demo in produzione).
- **Asserzioni** sul comportamento reale.
- **Teardown in `finally`** (eseguito SEMPRE, anche se le asserzioni falliscono):
  cancella in ordine inverso (payment/doc -> service -> project -> client ->
  eventuale smoke user; usa l'azione di dominio inversa se esiste, es.
  `invoice_void`). POI **verifica 0 leftover** con una query sul marker
  (`like 'DEMO-%'` -> 0 righe). Nessun residuo nel DB.
**Perche'**: il 2026-06-19 l'utente ha imposto "per test e2e fatti bene crei dati
demo che poi pulisci sistematicamente". Lo smoke prod FIX-4
(`prod-smoke-fix4.mjs`) gia' usava setup -> assert -> `finally` cleanup -> verifica
0 leftover, ed e' il pattern di riferimento. Dati demo lasciati nel DB inquinano
dashboard/fiscale/AI e rendono i test non deterministici (un run sporca il
successivo). Il cleanup va nel `finally`, non in coda al happy-path, o un fallimento
intermedio lascia spazzatura.

### WF-20: assert su valuta/numeri formattati -> grouping-agnostico (Node small-ICU vs browser full-ICU)

**Quando**: scrivo un test (unit Vitest/jsdom O e2e Playwright) che asserisce una
stringa di valuta o numero formattato con `toLocaleString("it-IT", ...)` /
`Intl.NumberFormat` (es. "2.984,50 €")
**Fare**: NON asserire la stringa col separatore delle migliaia hardcoded. Usare
un match grouping-agnostico: regex con dot opzionale (`/2\.?984,50/`) oppure
asserire solo decimali + simbolo (`/984,50\s*€/`), o usare valori < 1000 che non
attivano il raggruppamento. Per e2e ancorare al simbolo/colonna per non matchare
testo estraneo.
**Perche'**: il 2026-06-19 (#19 colonna "Da saldare") sia il test unit sia l'e2e
fallivano asserendo `"2.984,50"`: l'ICU di Node (jsdom) e della Chromium di
Playwright in questo ambiente NON applica il separatore delle migliaia e produce
`"2984,50 €"`, mentre il Chrome reale dell'utente (full-ICU) produce
`"2.984,50 €"`. Un assert con il punto hardcoded e' verde in un ambiente e rosso
nell'altro, pur essendo il codice corretto (WF-5: il sistema produceva il valore
giusto). Il display in produzione e' corretto; solo l'assertion era fragile.

### WF-21: E2E "tool rotto" -> distingui MCP browser dal Playwright DEL PROGETTO, non deferire

**Quando**: sto per deferire/saltare un E2E dichiarando "browser/chromium rotto"
o rinviarlo a dopo per un problema di tooling browser
**Fare**: distinguere la fonte. L'MCP browser (glance / playwright MCP) e il
Playwright DEL PROGETTO (`make test-e2e` / `npx playwright test`, chromium in
`~/Library/Caches/ms-playwright/`) sono INDIPENDENTI: un MCP rotto NON impedisce
`npx playwright test`. Girare l'E2E reale del progetto contro lo stack locale
(vite :5173 + supabase :55321 up). Se manca il browser del progetto:
`npx playwright install chromium`. L'oracolo dev'essere PRECISO, derivato dal
seed reale attraverso la formula reale (WF-5), non un match vago.
**Perche'**: il 2026-06-19 ho deferito l'E2E della formula INPS dicendo
"chromium MCP rotto" e ho dichiarato "fatto" senza E2E -> l'utente si e'
incazzato ("se lo strumento che ti serve e' rotto lo aggiusti"). In realta'
chromium-1208 del progetto funzionava: l'E2E (`fiscal-estimate.smoke.spec.ts`)
gira in ~7s e valida desktop+mobile INPS 650,71 / imposta 92,26 / accantona
61,91 dal seed deterministico (cassa 3200 -> reddito 2496 -> formula reale).
Deferire un controllore per un tool sbagliato-diagnosticato viola EXECUTABLE
GUARDRAILS e MONEY/FISCAL TDD.

---

## Checklist di auto-verifica (prima di dire "fatto")

**Ogni fix**: `typecheck` + `lint` + `build` → tutti 0 errori?
**Ogni modifica DB**: migration creata? types.ts aggiornato? tipi TS = DB?
**Ogni modifica UI lista**: MobilePageTitle? Filtri mobile (Sheet)? ResizableHead?

---

## Template per nuovi trigger

```markdown
### XX-N: [Breve descrizione]

**Quando**: [situazione che attiva il trigger]
**Fare**: [azione automatica]
**Perché**: [conseguenza se non si fa]
```

---

*File di auto-apprendimento — NON duplicare AGENTS.md*
