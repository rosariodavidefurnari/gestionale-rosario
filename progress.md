# Progress — Gestionale Rosario Furnari

## Current Phase

🟢 Fase 2 + Pulizia + Import + Verifica finanziaria completata. UX migliorata, pagamenti riallocati, deploy su Vercel.

## Last Session

### Sessione 13 (2026-02-27, sera)

- Completed:
  - **Deploy su Vercel** — Build OK, push a GitHub, deploy automatico
  - **Separazione workflow episodi/pagamenti** — QuickEpisodeDialog semplificato (solo servizio), QuickPaymentDialog nuovo (pagamento a livello progetto)
  - **Smart payment amounts** — Auto-fill importo in base al tipo: acconto=compensi, saldo=residuo, rimborso=totale spese
  - **Expenses nella view project_financials** — Migration `20260227230000_add_expenses_to_project_financials.sql`: aggiunge total_expenses da tabella expenses (km + materiale + noleggio con markup)
  - **Alert pagamenti intelligenti** — Dashboard mostra TUTTI i pagamenti pending con urgency (overdue/due_soon/pending), non solo finestra 7 giorni
  - **Progetto e note negli alert** — PaymentAlert esteso con projectName e notes per identificare i pagamenti
  - **Filtro cliente nella lista progetti** — Dropdown select con tutti i clienti (non badge, meglio UX con molti clienti)
  - **Fix ricerca progetti** — Campo "Cerca progetto" convertito da `q` (FTS, non funzionante) a `name@ilike` con wildcards
  - **Riallocazione COMPLETA pagamenti Diego** — Migration `20260227205707_reallocate_diego_payments.sql`:
    - Incrociati fogli CSV + fatture XML + DB per trovare allocazione corretta
    - DELETE 10 pagamenti errati, CREATE 11 corretti
    - Foglio 1: GS €6.761,59 + BTF €4.207,71 + 6 Spot €1.437,89 = €12.407,19
    - Foglio 2: GS €1.360,25 + BTF €1.322,10 + BM €7.152,10 = €9.834,45
    - Tutti gli spot a balance 0, GS a 0, BM a 0, Nisseno a 0
    - BTF mostra €669,60 = pending non fatturato, VIV mostra €389 = in attesa
    - Totale ricevuto invariato: €23.985,64

- Decisions:
  - Workflow pagamenti: separato da episodi, a livello progetto (non per singolo servizio)
  - Rimosso "parziale" come tipo pagamento (ridondante con acconto)
  - Rimosso "scaduto" dal dialog pagamento (auto-determinato dal sistema)
  - DROP VIEW + CREATE VIEW quando l'ordine colonne cambia (non CREATE OR REPLACE)
  - Fogli contabili CSV come fonte di verità per allocazione pagamenti
  - Km allocati proporzionalmente ai progetti basandosi sui dati foglio
  - Spese km NON fatturate al cliente (confermato dalle fatture XML)
  - Dropdown per filtro clienti (non badge) — scalabilità UX

- Migrations created:
  - `supabase/migrations/20260227230000_add_expenses_to_project_financials.sql`
  - `supabase/migrations/20260227205707_reallocate_diego_payments.sql`

- Files created:
  - `src/components/atomic-crm/projects/QuickPaymentDialog.tsx`

- Files modified:
  - `src/components/atomic-crm/projects/QuickEpisodeForm.tsx` (semplificato)
  - `src/components/atomic-crm/projects/QuickEpisodeDialog.tsx` (semplificato)
  - `src/components/atomic-crm/projects/ProjectShow.tsx` (+ QuickPaymentDialog, financials aggiornati)
  - `src/components/atomic-crm/projects/ProjectListFilter.tsx` (+ filtro cliente dropdown, fix ricerca)
  - `src/components/atomic-crm/dashboard/dashboardModel.ts` (alert urgency, projectName, notes)
  - `src/components/atomic-crm/dashboard/DashboardAlertsCard.tsx` (urgency UI, PaymentAlertRow)

- Next action: **Test visivo completo**, verifica deploy Vercel aggiornato

### Sessione 12 (2026-02-27)

- Completed:
  - **Import dati Diego Caltabiano** — Migration SQL `20260227100000_import_diego_caltabiano.sql`
    - 1 client (Diego Caltabiano, codice fiscale, P.IVA, email, telefono)
    - 9 projects (GS S1, BTF S1, SPOT S1, Borghi Marinari S2, GS regolari S2, BTF S2, montaggio bonus, HD Seagate, iPhone 14)
    - 64 services (16 GS S1 + 1 bonus + 15 BTF S1 + 6 SPOT S1 + 16 Borghi S2 + 3 GS S2 + 5 BTF S2 + 2 placeholder)
    - 7 payments (€999 + €2000 + €3113 + €2500 + €2000 + €1795.19 + €2682.35 = €15,089.54)
    - 3 expenses (HD Seagate €293, HD S2 €260, iPhone 14 -€500)
  - **Import spese km** — Migration `20260227110000_import_diego_km_expenses.sql`
    - 40 record expense tipo `spostamento_km`, uno per servizio con km > 0
    - Totale km expenses: €1,245.64
  - **Pagamento pendente + split per progetto** — Migrations:
    - `20260227120000_import_diego_pending_payment.sql` — pagamento iniziale €7,152.10
    - `20260227130000_import_diego_split_payments.sql` — split in 3 pagamenti per progetto:
      - GS S2: €989.24, Borghi Marinari: €5,201.36, BTF S2: €961.50
    - Assegnato `project_id` ai pagamenti esistenti (Foglio 1 → GS, Foglio 2 acconto → Borghi)
  - **UI: Riepilogo finanziario cliente** — `ClientFinancialSummary.tsx`
    - 4 metric cards: Compensi, Rimborso km (+spese), Pagato, Da saldare
    - Aggiunto alla scheda ClientShow
  - **UI: Riepilogo finanziario progetto** — `ProjectFinancials` in `ProjectShow.tsx`
    - 4 metriche: Servizi, Compensi, Km, Totale
  - **UI: Filtro per progetto** — Aggiunto a PaymentListFilter e ExpenseListFilter
  - **UI: Colonna Progetto** — Aggiunta a PaymentListContent
  - **FIX CRITICO: Prodotto cartesiano nella view project_financials** — Migration `20260227140000_fix_project_financials_view.sql`
    - Bug: LEFT JOIN services × payments produceva N×M righe, gonfiando tutti i totali
    - Fix: pre-aggregazione in subquery prima del JOIN
    - Compensi mostrati: €73,141 → dovrebbe essere ~€20,942
  - **Verifica totali** — Python script verifica al centesimo:
    - Foglio 1: €12,407.19 ✅
    - Foglio 2: €9,834.45 ✅
    - Grand Total: €22,241.64 ✅
    - Pagamenti: €15,089.54 ✅
    - Da saldare: €7,152.10 ✅
  - **Tutte le 5 migration pushate al DB remoto** ✅
  - Typecheck: 0 errori, Build: OK

- Decisions:
  - Migration idempotente con `ON CONFLICT DO NOTHING` su settings e client
  - Km rate €0.19 applicato ai totali foglio (colonna km_amount in DB)
  - HD Seagate con markup 25% (€234 → €293 per il cliente)
  - iPhone 14 come spesa negativa (-€500) perché è un credito/detrazione
  - Montaggio bonus come progetto separato (servizio singolo a €249)
  - 2 servizi BTF S2 come placeholder (data 2025-06-01 e 2025-07-01, importi zero)
  - Spese km create come record `spostamento_km` nella tabella expenses (1 per servizio con km > 0)
  - Pagamento pendente diviso proporzionalmente per progetto (GS 13.8%, Borghi 72.7%, BTF 13.4%)
  - View fix con subquery pre-aggregation per evitare Cartesian product

- Migrations created:
  - `supabase/migrations/20260227100000_import_diego_caltabiano.sql`
  - `supabase/migrations/20260227110000_import_diego_km_expenses.sql`
  - `supabase/migrations/20260227120000_import_diego_pending_payment.sql`
  - `supabase/migrations/20260227130000_import_diego_split_payments.sql`
  - `supabase/migrations/20260227140000_fix_project_financials_view.sql`

- Files created:
  - `src/components/atomic-crm/clients/ClientFinancialSummary.tsx`

- Files modified:
  - `src/components/atomic-crm/clients/ClientShow.tsx` (+ ClientFinancialSummary)
  - `src/components/atomic-crm/projects/ProjectShow.tsx` (+ ProjectFinancials section)
  - `src/components/atomic-crm/payments/PaymentListFilter.tsx` (+ filtro progetto)
  - `src/components/atomic-crm/payments/PaymentListContent.tsx` (+ colonna Progetto)
  - `src/components/atomic-crm/expenses/ExpenseListFilter.tsx` (+ filtro progetto)

- Continued (same session):
  - **Fix invoice_ref mancanti** — Migration `20260227190000_fix_missing_invoice_refs.sql`
    - 2 pagamenti (€989.24 e €5,201.36 del 10/11/2025) senza invoice_ref → assegnato FPR 6/25
    - Query remota via REST API con service_role key (bypassa RLS)
  - **Fix payment_type acconto → saldo** — Migration `20260227210000_fix_payment_types.sql`
    - €3,113 (03/03/2025) FPR 1/25: era "acconto", è "saldo" (completa la fattura)
    - €2,682.35 (14/10/2025) FPR 4/25: era "acconto", è "saldo" (unico pagamento)
    - Verifica sistematica: lette 5 fatture PDF, confrontati importi e date
  - **Servizi BTF non fatturati** — Migration `20260227200000_complete_btf_cantina_tre_santi.sql`
    - 18/09 (vendemmia) e 21/10 (puntata finale) a Cantina Tre Santi con fee=0
    - Confronto date fatture: nessuna fattura copre quelle date → lavoro non fatturato
    - Completati con tariffe standard BTF: shooting=187, editing=125, km=120
  - **Spese e pagamento BTF mancanti** — Migration `20260227220000_btf_extra_expenses_and_payment.sql`
    - 2 expense spostamento_km (120km × €0.19 ciascuno)
    - 1 payment in_attesa €669.60 (saldo per 2 puntate BTF non fatturate)
  - **Verifica km rate da file originale** — Letto file Numbers con numbers_parser
    - Confermato €0.19/km su tutti i servizi (nessuna eccezione)
  - **Google Calendar MCP** — Configurato server MCP per Google Calendar
    - OAuth credentials Google Cloud salvate in ~/.config/google-calendar-mcp/
    - Server aggiunto con `claude mcp add` (pacchetto @cocal/google-calendar-mcp)
  - **Tutte le 4 migration pushate al DB remoto** ✅

- Decisions (continued):
  - Verifica finanziaria via fatture PDF (date + importi), non solo file originale Numbers
  - Servizi completati ma non fatturati: creare anche expense km e payment in_attesa
  - payment_type "saldo" quando il pagamento completa la fattura (anche se c'è un acconto precedente)
  - €0.19/km confermato come rate uniforme da file originale

- Migrations created (continued):
  - `supabase/migrations/20260227190000_fix_missing_invoice_refs.sql`
  - `supabase/migrations/20260227200000_complete_btf_cantina_tre_santi.sql`
  - `supabase/migrations/20260227210000_fix_payment_types.sql`
  - `supabase/migrations/20260227220000_btf_extra_expenses_and_payment.sql`

- Next action: **Test visivo completo**, deploy Vercel, verifica date BTF su Google Calendar

### Sessione 11 (2026-02-26)

- Completed:
  - **Pulizia moduli Atomic CRM** — 4 fasi completate (A→D)
    - **Fase A**: Migration DB `20260226200000_client_tasks_notes_tags.sql`
      - Tabella `client_tasks` (UUID PK, FK opzionale a clients ON DELETE SET NULL)
      - Tabella `client_notes` (UUID PK, FK obbligatoria a clients ON DELETE CASCADE)
      - Colonna `tags BIGINT[]` aggiunta a clients
      - RLS + policy su tutte le nuove tabelle
      - Pushata al DB remoto con successo
    - **Fase B**: Adattamento Tasks, Notes, Tags per clients
      - Tasks adattati: `contact_id` → `client_id`, resource `tasks` → `client_tasks`
      - 10 file nel modulo tasks/ riscritti (Task, AddTask, TaskFormContent, TaskCreateSheet, TaskEdit, TaskEditSheet, TasksIterator, TasksListFilter, TasksListEmpty)
      - Notes clienti: ClientNoteItem.tsx + ClientNotesSection.tsx (inline create/list)
      - Tags clienti: ClientTagsList.tsx + ClientTagsListEdit.tsx (in tags/)
      - ClientShow aggiornato con sezioni Tags, Note, Promemoria
      - ClientTasksSection.tsx per promemoria nella scheda cliente
      - TasksList.tsx (pagina lista desktop per tab Promemoria)
    - **Fase C**: Rimozione moduli morti
      - 5 directory eliminate: companies/ (14), contacts/ (24), deals/ (16), activity/ (9), notes/ (14)
      - Sales UI rimossa (SalesList, SalesCreate, SalesEdit, SalesInputs), tenuto SaleName + headless
      - Import module eliminato (ImportPage, useImportFromJson — era per contacts/companies)
      - Commons puliti: activity.ts, getCompanyAvatar, getContactAvatar, mergeContacts eliminati
      - FakeRest generators eliminati: companies, contacts, contactNotes, deals, dealNotes, tasks
      - supabase/dataProvider.ts: rimosso view routing companies/contacts, unarchiveDeal, getActivityLog, mergeContacts, callbacks morti
      - fakerest/dataProvider.ts: rimosso tutti callbacks companies/contacts/deals/tasks
      - SettingsPage: rimosso sezioni "Aziende" e "Trattative"
      - Header: rimosso ImportFromJsonMenuItem e UsersMenu, aggiunto tab "Promemoria"
      - MobileNavigation: rimosso contacts/companies/deals, CreateButton crea solo Promemoria
      - ConfigurationContext: rimosso companySectors, dealCategories, dealStages, dealPipelineStatuses
      - types.ts: rimosso Company, Contact, Deal, DealNote, ContactNote (old), Task (old), Activity, ContactGender
      - consts.ts: rimosso costanti activity log vecchie
      - App.tsx: aggiornato commento JSDoc
      - ContactOption.tsx eliminato, SettingsPage.test.ts (deals) eliminato
    - **Fase D**: Verifica completa
      - Typecheck: 0 errori ✅
      - Build: OK (4.35s) ✅
      - Test: 42/42 passati ✅
      - Lint: 0 nuovi errori ✅

- Decisions:
  - client_tasks.client_id è opzionale (ON DELETE SET NULL) — promemoria possono essere generici
  - client_notes.client_id è obbligatorio (ON DELETE CASCADE) — note sempre legate a un cliente
  - Tags usano BIGINT[] sulla tabella clients (match con tags.id BIGINT)
  - Import module rimosso interamente (era per formato Atomic CRM, non compatibile)
  - Sales mantenuto headless (tabella + trigger) per futuro multi-utente
  - Pagina /settings semplificata: solo Marchio, Note, Attività

- Migration created:
  - `supabase/migrations/20260226200000_client_tasks_notes_tags.sql`

- Files created (Fase B):
  - `src/components/atomic-crm/clients/ClientNoteItem.tsx`
  - `src/components/atomic-crm/clients/ClientNotesSection.tsx`
  - `src/components/atomic-crm/clients/ClientTasksSection.tsx`
  - `src/components/atomic-crm/tags/ClientTagsList.tsx`
  - `src/components/atomic-crm/tags/ClientTagsListEdit.tsx`
  - `src/components/atomic-crm/tasks/TasksList.tsx`

- Files heavily modified:
  - `src/components/atomic-crm/tasks/` (10 file — contact → client)
  - `src/components/atomic-crm/clients/ClientShow.tsx` (tags + notes + tasks)
  - `src/components/atomic-crm/root/CRM.tsx` (risorse pulite)
  - `src/components/atomic-crm/providers/supabase/dataProvider.ts` (cleanup)
  - `src/components/atomic-crm/providers/fakerest/dataProvider.ts` (cleanup)
  - `src/components/atomic-crm/settings/SettingsPage.tsx` (sezioni ridotte)
  - `src/components/atomic-crm/layout/Header.tsx` (+Promemoria, -Import, -Utenti)
  - `src/components/atomic-crm/layout/MobileNavigation.tsx` (cleanup)
  - `src/components/atomic-crm/root/ConfigurationContext.tsx` (interface ridotta)
  - `src/components/atomic-crm/root/defaultConfiguration.ts` (defaults ridotti)
  - `src/components/atomic-crm/types.ts` (+ClientTask, +ClientNote, -Company, -Contact, -Deal, ecc.)
  - `src/components/atomic-crm/consts.ts` (costanti ridotte)

- Next action: **Import dati reali Diego Caltabiano** (da docs/data-import-analysis.md)

### Sessione 10 (precedente)

- Dashboard finanziaria con Recharts (4 KPI, 2 grafici, pipeline, alert)
- Mobile dashboard KPI-only
- Fix build production (useWatch import)
- Typecheck 0, build OK

### Sessione 9 (precedente)

- Modulo Preventivi (Quotes) — Kanban 10 stati, drag-and-drop, 13 file

### Sessione 7

- DB migration Fase 2, 5 moduli CRUD, 60/60 test

## Previous Sessions

- 2026-02-26 (sessione 10): Dashboard finanziaria Recharts
- 2026-02-26 (sessione 9): Modulo Preventivi Kanban
- 2026-02-26 (sessione 8): Solo documentazione
- 2026-02-26 (sessione 7): 5 moduli CRUD + migration
- 2026-02-25 (sessione 6): Design completo Fase 2
- 2026-02-25 (sessione 5): Deploy Vercel, Edge Functions, CORS
- 2026-02-25 (sessione 4): Audit, fix signup, keep-alive
- 2026-02-25 (sessione 3): Fix stringhe inglesi
- 2026-02-25 (sessione 2): i18n Provider, ~200+ stringhe
- 2026-02-25 (sessione 1): Fork, Supabase remoto, migration, RLS

## Next Steps

1. [x] DB migration (discount + tariffe + views)
2. [x] Modulo Clienti
3. [x] Modulo Progetti
4. [x] Modulo Registro Lavori (Services)
5. [x] Modulo Preventivi (Quotes)
6. [x] Modulo Pagamenti
7. [x] Modulo Spese
8. [x] Dashboard Recharts
9. [x] Pulizia moduli Atomic CRM + adattamento Tasks/Notes/Tags
10. [x] Import dati reali Diego Caltabiano (84 record + 40 km expenses + 3 split payments)
11. [x] Fix prodotto cartesiano view project_financials + UI finanziari (ClientShow, ProjectShow)
12. [ ] Test visivo completo di ogni modulo (in corso)
13. [ ] Deploy su Vercel e test in produzione

## Remaining Low-Priority Items

- FakeRest data generators usano `faker/locale/en_US` (solo demo mode, non produzione)
- 4 vulnerabilità npm (1 moderate, 3 high) — da valutare con `npm audit`
- Warnings Vitest su promise non awaited in supabaseAdapter.spec.ts (codice upstream)
- Verificare che signup sia disabilitato anche nel **Supabase Dashboard remoto**
- Edge Function `postmark` crasha (manca secrets Postmark — non prioritaria)
- 3 errori lint pre-esistenti (useGetOne condizionale in ExpenseShow/PaymentShow, mergeTranslations inutilizzato in i18nProvider)

## Certezze (sessione 12)

- [x] Import Diego Caltabiano: 84 record + 40 km expenses + 3 split payments = 127 record totali
- [x] Totali verificati al centesimo: €22,241.64 totale, €15,089.54 pagato, €7,152.10 da saldare
- [x] 5 migration pushate al DB remoto con successo
- [x] Fix prodotto cartesiano view project_financials (subquery pre-aggregation)
- [x] Filtri per progetto aggiunti a Pagamenti e Spese
- [x] Colonna Progetto aggiunta alla lista Pagamenti
- [x] Riepilogo finanziario su ClientShow e ProjectShow
- [x] Typecheck 0 errori, build OK

## Certezze (sessione 11)

- [x] Pulizia completata: 0 moduli Atomic CRM residui (companies, contacts, deals eliminati)
- [x] Tasks adattati come "Promemoria" (client_tasks), Notes come "Note clienti" (client_notes), Tags su clients
- [x] Navigazione aggiornata con 8 tab (+ Promemoria)
- [x] Typecheck 0 errori, build OK, 42/42 test, lint 0 nuovi errori
- [x] Migration client_tasks + client_notes + tags applicata al DB remoto

## Architectural Decisions Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-02-25 | Fork Atomic CRM come base | Stack compatibile, CRM modulare, MIT license |
| 2026-02-25 | Preservare .claude/skills/ e AGENTS.md | Guide preziose per sviluppo |
| 2026-02-25 | Nuova migration SQL anziché modificare le esistenti | Schema completamente diverso |
| 2026-02-25 | Recharts per grafici dashboard | Specifica lo richiede, gratuito |
| 2026-02-25 | RLS policy semplice auth.uid() IS NOT NULL | Single user |
| 2026-02-25 | Traduzioni inline nei componenti | Atomic CRM non usa useTranslate() |
| 2026-02-25 | Alias Vite per react-router | Compatibilità v6/v7 |
| 2026-02-25 | Audit obbligatorio a fine fase | Trovati problemi critici in fase "completata" |
| 2026-02-26 | Moduli custom in directory separate | Non modificare i moduli originali, più pulito |
| 2026-02-26 | Navigazione progressiva | Aggiungere tab man mano che i moduli vengono creati |
| 2026-02-26 | Table component per le liste | Più appropriato di CardList per dati tabulari |
| 2026-02-26 | Quotes usa Dialog modali come Deals | Pattern Kanban richiede overlay, non pagine dedicate |
| 2026-02-26 | Quote statuses come costanti locali | Fissi nel DB CHECK, non serve ConfigurationContext |
| 2026-02-26 | Niente archived_at per quotes | Status finali (saldato/rifiutato/perso) coprono il caso |
| 2026-02-26 | Dashboard aggregata | Componenti UI piccoli, dati/trasformazioni centralizzati |
| 2026-02-26 | Primary key esplicite per views | monthly_revenue e project_financials non hanno id |
| 2026-02-26 | client_tasks con FK opzionale | Promemoria possono essere generici o legati a un cliente |
| 2026-02-26 | Import module rimosso | Era per formato Atomic CRM (contacts/companies), non compatibile |
| 2026-02-26 | Sales headless (senza UI) | Tabella+trigger mantenuti per futuro multi-utente |
