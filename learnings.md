# Learnings — Gestionale Rosario Furnari

Questo file cresce organicamente sessione dopo sessione.
Claude aggiunge qui le scoperte, gli errori corretti, e i pattern emersi.
Quando supera ~30 voci — consolidare (vedi .claude/rules/session-workflow.md).

## Format per ogni voce

- [DATA] **Nome pattern** — Descrizione. Contesto: cosa stava succedendo.

## Learnings

- [2026-02-25] **Atomic CRM ha già .claude/skills/** — Il repo originale include
  skill per frontend-dev e backend-dev con convenzioni precise (componenti admin,
  ra-core hooks, Edge Functions Deno). Non sovrascrivere mai questi file.

- [2026-02-25] **AGENTS.md è documentazione essenziale** — Contiene comandi make,
  struttura directory, pattern architetturali, gestione database. Va letto prima
  di qualsiasi modifica al progetto.

- [2026-02-25] **i18n: Atomic CRM NON usa useTranslate() nei componenti** — Le stringhe
  UI sono hardcoded in inglese direttamente nel JSX. L'i18nProvider gestisce solo
  le stringhe framework di ra-core (bottoni, messaggi validazione, ecc.). Per tradurre
  l'interfaccia servono modifiche dirette ai ~40 file con stringhe hardcoded.

- [2026-02-25] **Pacchetto @christianascone/ra-language-italian non funziona** — Ha
  dependency conflicts con ra-core@5.14.2. Soluzione: traduzioni italiane inline
  direttamente in i18nProvider.tsx (copiate e adattate dal pacchetto).

- [2026-02-25] **react-router v6/v7 conflict** — ra-core dipende da react-router-dom@6
  che installa react-router@6 come nested dep. Il progetto usa react-router@7. Routes
  da v7 rifiuta Route da v6. Fix: alias Vite `"react-router-dom" → "react-router"` in
  entrambi i config (vite.config.ts + vite.demo.config.ts).

- [2026-02-25] **CoreAdminRoutes.js necessita flatten** — React Router v7 è più strict
  con i children di Routes. Le custom routes di ra-core sono nested arrays. Fix:
  `.flat(Infinity)` via patch-package (patches/ra-core+5.14.2.patch).

- [2026-02-25] **Variabili env usano prefisso VITE_** — Non NEXT_PUBLIC_ come
  in Next.js. Il file è `.env.development` (non `.env.local`). La chiave
  Supabase si chiama `VITE_SB_PUBLISHABLE_KEY`.

- [2026-02-25] **CRM configurabile via props** — Il componente `<CRM>` in App.tsx
  accetta props per sectors, stages, categories, logo, title. La configurazione
  viene anche caricata dal DB (tabella `configuration`).

- [2026-02-25] **Supabase CLI non ha `db execute`** — Per eseguire SQL sul DB remoto
  usare il Dashboard SQL Editor o psql diretto. Il CLI supporta solo: diff, dump,
  lint, pull, push, reset, start.

- [2026-02-25] **DB remoto allineato** — Tutte le 17 migration applicate (16 Atomic CRM
  + 1 custom). 8 tabelle custom con RLS attivo, 2 views, dati iniziali inseriti.
  Progetto ref: qvdmzhyzpyaveniirsmo.

- [2026-02-25] **personalInfoTypes: separare id da label** — I tipi email/telefono
  (Work/Home/Other) devono mantenere id in inglese (valore salvato nel DB) ma mostrare
  label in italiano. Aggiunto campo `name` agli oggetti choices e usato `optionText="name"`.

- [2026-02-25] **Valute e locale: aggiornare ovunque** — Le formattazioni
  `toLocaleString("en-US", { currency: "USD" })` vanno cambiate in
  `toLocaleString("it-IT", { currency: "EUR" })` in DealShow.tsx e CompanyShow.tsx.

- [2026-02-25] **date-fns locale per date relative** — `formatDistance()` richiede
  `{ locale: it }` come terzo parametro per output in italiano. Import:
  `import { it } from "date-fns/locale"`.

- [2026-02-25] **sed con JSX: usare python3 -c** — I comandi `sed` falliscono con
  delimitatori `<` e `>` nel JSX. Meglio usare `python3 -c` con `str.replace()` per
  sostituzioni massive nei file .tsx.

- [2026-02-25] **ra-core auto-genera label dai source in inglese** — Quando un input
  (TextInput, SelectInput, DateInput, ecc.) non ha prop `label` esplicita, ra-core
  genera la label dal `source`: `expected_closing_date` → "Expected Closing Date".
  Per l'italiano, OGNI input deve avere `label="..."` esplicita.

- [2026-02-25] **Traduzione in 3 livelli** — La localizzazione completa richiede:
  1) i18nProvider per le stringhe framework ra-core (bottoni, paginazione, validazione)
  2) Stringhe hardcoded nel JSX (titoli, testi, messaggi notify)
  3) Label degli input via prop `label` (altrimenti auto-generati in inglese dal source)
  Il livello 3 è facile da dimenticare perché i campi "funzionano" senza label esplicita.

- [2026-02-25] **MAI dichiarare una fase completata senza audit** — Il progress.md
  diceva "Fase 4 completata" ma un audit reale ha trovato: signup pubblico abilitato
  (critico), keep-alive workflow mancante, 18 file con Prettier rotto, residui i18n,
  commit non pushati. Regola: prima di marcare una fase come completata, eseguire
  SEMPRE una verifica indipendente (typecheck + test + lint + review config + review
  specifica). Non fidarsi mai dello stato scritto senza controllare.

- [2026-02-25] **Edge Functions richiedono SB_SECRET_KEY come secret separato** —
  `supabaseAdmin.ts` usa `Deno.env.get("SB_SECRET_KEY")` che NON è tra le variabili
  auto-iniettate da Supabase (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
  Va impostato manualmente con `npx supabase secrets set SB_SECRET_KEY=<service_role_key>`.
  Senza questo secret, le funzioni crashano con WORKER_ERROR anche sulle OPTIONS requests.

- [2026-02-25] **Utenti creati manualmente da Dashboard non triggano on_auth_user_created** —
  Il trigger `handle_new_user()` crea il record in `sales` solo quando un utente fa signup
  via API. Utenti creati dal Dashboard Supabase bypassano il trigger. Fix: inserire
  manualmente il record in `sales` e aggiornare `raw_user_meta_data` in `auth.users`.

- [2026-02-25] **deploy.yml di Atomic CRM è per GitHub Pages, non Vercel** — Il workflow
  originale deploya su GitHub Pages con `gh-pages`. Con Vercel collegato al repo, il
  deploy è automatico su push. Il workflow va disabilitato o impostato su manual dispatch.

- [2026-02-25] **Scrivere design/analisi in file .md, non in chat** — L'utente ha
  esplicitamente chiesto di non scrivere design lunghi nella chat ma in file dedicati
  sotto `docs/`. Questo permette di consultarli nelle sessioni successive senza perderli.

- [2026-02-25] **SPOT = tariffa flat, non spezzata** — Gli spot hanno una tariffa unica
  (€312) che copre riprese + montaggio. Nel DB va in `fee_other` con `fee_shooting=0`
  e `fee_editing=0`. Il setting key va rinominato da `default_fee_editing_spot` a
  `default_fee_spot` per chiarezza.

- [2026-02-25] **numbers-parser per file .numbers** — I file Apple Numbers non sono
  leggibili direttamente (binari). Usare `pip3 install numbers-parser` e script Python
  per estrarre i dati. Il tool Read di Claude può leggere il file ma non parsare i dati
  strutturati delle celle.

- [2026-02-25] **Design phase obbligatoria prima di implementazione** — L'utente ha
  voluto vedere wireframe e design di OGNI modulo prima di scrivere codice. Creati
  `docs/design-fase2.md` (wireframe) e `docs/data-import-analysis.md` (dati reali).
  La Fase 2 è critica perché modifica il software, non lo usa soltanto.

- [2026-02-25] **Tariffe 2025/2026 aggiornate** — Nuove tariffe da PDF:
  Riprese €233, Montaggio GS €311, Montaggio VIV €156, SPOT completo €312.
  Aumento ~25% rispetto alle tariffe precedenti. Nuovo programma TV: Vale il Viaggio (VIV).

- [2026-02-26] **Moduli custom in directory separate** — Creati i nuovi moduli
  (clients, projects, services, payments, expenses) come directory separate in
  `src/components/atomic-crm/`, senza modificare i moduli originali di Atomic CRM.
  Ogni modulo segue la stessa struttura: index.tsx, List, ListContent, ListFilter,
  Create, Edit, Show, Inputs, Types.

- [2026-02-26] **Table component per liste tabulari** — Usato il componente Table
  di shadcn/ui (non CardList) per le liste dei moduli. Più appropriato per dati
  tabulari come servizi, pagamenti, spese. Import da `@/components/ui/table`.

- [2026-02-26] **useWatch per campi condizionali e totali real-time** — `useWatch`
  di react-hook-form è perfetto per: conditional rendering
  (campo tv_show visibile solo se category=produzione_tv), sezioni alternative
  (km vs importo in spese), e calcoli real-time (totali compensi in servizi).
  Import consigliato: `from "react-hook-form"` (non `ra-core`). Sintassi:
  `const value = useWatch({ name: "field_name" })`.

- [2026-02-26] **useGetOne per FK nelle liste** — Per mostrare nomi relazionali
  (es: nome progetto nella lista servizi), usare `useGetOne("resource", { id, enabled })`.
  Il parametro `enabled: !!id` evita fetch inutili quando l'FK è null.

- [2026-02-26] **Export CSV con fetchRelatedRecords** — Per includere nomi relazionali
  nel CSV (es: nome cliente nel CSV progetti), usare `fetchRelatedRecords` passato
  come secondo parametro dell'exporter. Esempio:
  `const clients = await fetchRelatedRecords(records, "client_id", "clients");`

- [2026-02-26] **Badge colorati per stati e tipi** — Pattern consolidato: definire
  una mappa `colorMap` con variant shadcn (default, secondary, destructive, outline)
  e usare `<Badge variant={colorMap[value]}>{label}</Badge>`. Le mappe label e color
  vanno nel file `[modulo]Types.ts`.

- [2026-02-26] **Non chiedere conferma su cose già documentate** — L'utente si è
  irritato quando gli è stato chiesto "da dove vuoi partire?" mentre l'ordine era
  già scritto in progress.md e docs/design-fase2.md. Regola: seguire il piano
  documentato senza chiedere conferma inutile. Chiedere SOLO per decisioni non
  coperte dalla documentazione.

- [2026-02-26] **Adattamento Kanban da Deals a Quotes** — Il pattern è quasi 1:1.
  Differenze chiave: campo `stage` → `status`, costanti locali anziché ConfigurationContext,
  niente `archived_at` (gli stati finali sono colonne normali), niente `sales_id`/`contact_ids`.
  La logica di reindex (updateQuoteStatus/updateQuoteStatusLocal) è identica cambiando solo
  il nome campo e il nome risorsa nel dataProvider.

- [2026-02-26] **Quotes richiede colonna `index` non prevista nello schema** — La tabella
  quotes originale nella migration non aveva la colonna `index` (SMALLINT) necessaria per
  l'ordinamento Kanban. Servita migration dedicata. Lezione: quando si adatta un pattern
  che usa un campo (come il Kanban con index), verificare che il campo esista nello schema.

- [2026-02-26] **Dialog modali per moduli Kanban, pagine full per moduli CRUD** — Due
  pattern distinti nel gestionale: i moduli CRUD (Clienti, Progetti, Servizi, Pagamenti,
  Spese) usano pagine full con Card layout e CreateBase/EditBase/ShowBase. I moduli
  Kanban (Preventivi, Deals) usano Dialog modali che si sovrappongono al board. Il
  pattern è determinato dal tipo di vista principale (tabella vs board).

- [2026-02-26] **Hooks React prima dei return condizionali** — ESLint `react-hooks/rules-of-hooks`
  rileva quando un hook (es: useGetOne) è chiamato dopo un `if (!record) return null`.
  Fix: spostare il hook prima del return condizionale e usare `enabled: !!record?.field`
  per evitare fetch inutili. Pattern: tutti gli hook in cima, poi i guard return.

- [2026-02-26] **10 colonne Kanban: min-width + overflow-x-auto** — Con 10 colonne,
  `flex-1` da solo produce colonne troppo strette. Soluzione: `min-w-[150px]` su ogni
  colonna + `overflow-x-auto` sul container + `text-xs` per gli header. Il gap tra
  colonne va ridotto da `gap-4` (Deals, 6 colonne) a `gap-2` (Quotes, 10 colonne).

- [2026-02-26] **Typecheck può passare ma Vite build fallire sugli export runtime** —
  In Fase 2 il codice compilava con `tsc --noEmit`, ma `npm run build` falliva perché
  `useWatch` era importato da `ra-core` (non esportato nel bundle runtime). Lezione:
  dopo modifiche ai form/hooks fare SEMPRE anche `npm run build`, non solo typecheck.

- [2026-02-26] **Views Supabase senza `id` richiedono primaryKeys esplicite nel dataProvider** —
  Le views `monthly_revenue` e `project_financials` non hanno colonna `id`. Per usarle
  in React Admin con `ra-supabase-core/@raphiniert/ra-data-postgrest` serve mappare le
  PK nel provider (`monthly_revenue` => `month,category`; `project_financials` => `project_id`).

- [2026-02-26] **Dashboard complessa: separare fetch e aggregazioni dalla UI** —
  Per la dashboard finanziaria (KPI + grafici + alert) è più robusto avere:
  `useDashboardData.ts` (query `useGetList`) + `dashboardModel.ts` (aggregazioni/format)
  + componenti presentazionali piccoli (card/grafici). Riduce duplicazioni e facilita debug.

- [2026-02-26] **UUID vs BIGINT: nuove tabelle per FK incompatibili** — Le tabelle originali
  Atomic CRM usano BIGINT per `contacts.id` e `tasks.contact_id`. Il gestionale usa UUID per
  `clients.id`. Non è possibile alterare le FK — serve creare nuove tabelle (`client_tasks`,
  `client_notes`) con UUID PK e FK. Pattern: quando il tipo di ID cambia, non adattare la
  vecchia tabella, creane una nuova.

- [2026-02-26] **FK opzionale con ON DELETE SET NULL per entità generiche** — `client_tasks`
  ha `client_id` opzionale (FK con ON DELETE SET NULL) perché un promemoria può essere generico
  ("comprare hard disk") o legato a un cliente. `client_notes` ha `client_id` obbligatorio
  (ON DELETE CASCADE) perché una nota senza cliente non ha senso. La scelta SET NULL vs CASCADE
  dipende dal significato semantico della relazione.

- [2026-02-26] **Pulizia moduli: analisi prima, decisione poi, esecuzione rapida** — L'utente
  si è irritato quando ho proposto di eliminare moduli senza spiegare cosa facessero. Pattern
  corretto: (1) analisi approfondita con documento dedicato, (2) presentare opzioni chiare,
  (3) ottenere approvazione, (4) eseguire rapidamente senza chiedere conferme intermedie.

- [2026-02-26] **FakeRest dataProvider: lifecycle callbacks pesanti** — Il dataProvider FakeRest
  aveva ~300 righe di callbacks per companies, contacts, deals, tasks (update nb_contacts,
  nb_deals, nb_tasks, avatar processing, company name sync). Nella pulizia, rimuovere prima
  i callbacks è più sicuro che rimuovere prima i tipi — evita errori di compilazione intermedi.

- [2026-02-26] **Import module non riutilizzabile con schema diverso** — Il modulo Import di
  Atomic CRM (ImportPage + useImportFromJson) era strutturato per importare companies → contacts
  → notes → tasks con FK BIGINT e ID mapping. Con lo schema UUID del gestionale, non è
  adattabile — va riscritto da zero quando servirà.
