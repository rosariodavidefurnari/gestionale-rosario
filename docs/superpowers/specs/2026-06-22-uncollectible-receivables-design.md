# Crediti inesigibili / write-off operativo - Design Spec

Data: 2026-06-22
Stato: v2 - review spec integrata, pronta per piano
Obiettivo persistente: gestire end-to-end i crediti inesigibili partendo da
Aidone `FPA 1/23` da 375 EUR, senza falsare cassa, fiscalita' o dashboard.

## Scopo

Definire una semantica di dominio per una fattura emessa ma mai incassata:

- la fattura storica resta visibile;
- l'incasso resta assente;
- il residuo operativo viene chiuso;
- la chiusura e' tracciabile con data e motivo;
- il credito non compare piu' in "Da incassare", scaduti o solleciti;
- il credito non entra mai in `ricevuto`, cassa, fiscalita' o cash-vs-competenza.

## Problema

Il caso reale e' il pagamento Aidone:

- cliente: Comune di Aidone;
- documento: `FPA 1/23`;
- importo: 375 EUR;
- stato attuale: `scaduto`;
- note attuali: "Mai pagata - scaduta dal 2023";
- fattura storica presente in `financial_documents`;
- pagamento non collegato via `financial_document_id`, scelta gia' fatta per
  evitare che la fattura storica scaduta diventi annullabile da `invoice_void`.

Oggi il gestionale ha solo tre stati pagamento:

- `ricevuto`: denaro entrato o rimborso effettuato;
- `in_attesa`: credito atteso;
- `scaduto`: credito atteso oltre scadenza.

Manca lo stato "non lo inseguo piu', ma non e' incasso". Per questo Aidone resta
contemporaneamente:

- dentro il saldo operativo `client_commercial_position.balance_due`;
- dentro la card "Da incassare";
- dentro scaduti/solleciti se il filtro e' `status != ricevuto`;
- fuori dalla cassa e dalla fiscalita', correttamente, perche' non e'
  `ricevuto`.

La parte corretta va preservata: non deve diventare incasso.
La parte sbagliata va chiusa: non deve restare un'azione operativa aperta.

## Fonti di verita' verificate

### Governance e processo

- `AGENTS.md`: spec-first/plan-first obbligatorio per soldi, fiscalita',
  pagamenti, fatture e UI/mobile.
- `docs/CANTIERE.md`: richiede review multidimensione per spec, piano e
  implementazione, e browser reale per UI/UX.
- `docs/README.md`: la semantica finanziaria fragile va risolta nel sistema, non
  normalizzata nei test.
- `docs/cli/COMMAND_MAP.md`: comandi ufficiali per test, typecheck, lint,
  health e governance.
- `docs/workflows/WORKFLOW_MAP.md`: `frontend-quality-gate`,
  `production-financial-health`, `local-e2e-smoke`, `pre-commit-continuity-guard`.
- `docs/artifacts/ARTIFACT_MAP.md`: Supabase remoto e' pericoloso; test/browser
  output e' rigenerabile; `Fatture/**` non va toccato.

### Codice e dati

- `supabase/migrations/20260225180000_gestionale_schema.sql`: constraint
  iniziale `payments.status IN ('ricevuto','in_attesa','scaduto')`.
- `src/components/atomic-crm/types.ts`: `Payment.status` e' la union
  `"ricevuto" | "in_attesa" | "scaduto"`.
- `src/components/atomic-crm/payments/paymentTypes.ts`: choices/label UI dei
  tre stati.
- `supabase/migrations/20260401094930_single_source_financials.sql`:
  `project_financials` e `client_commercial_position.total_paid` sommano solo
  `status = 'ricevuto'` e calcolano `balance_due = total_fees +
  total_expenses - total_paid`.
- `src/lib/analytics/outstandingReceivables.ts`: la card "Da incassare" usa
  `sum(max(0, balance_due))`, quindi la chiusura operativa deve passare dalla
  vista, non da un filtro locale della card.
- `src/components/atomic-crm/dashboard/DashboardDeadlineTracker.tsx`: oggi fetch
  pagamenti con `status@neq: ricevuto`; un nuovo stato non escluso resterebbe
  nei solleciti.
- `src/components/atomic-crm/dashboard/dashboardDeadlineTrackerModel.ts`: un
  pagamento con data passata entra negli scaduti anche se non e' esplicitamente
  `scaduto`, salvo filtro a monte.
- `src/lib/ai/unifiedCrmReadContext.ts`: oggi i pending AI sono
  `status !== "ricevuto" && payment_type !== "rimborso"`.
- `src/components/atomic-crm/invoices/financialDocumentHelpers.ts`:
  lo stato incasso fattura deriva dai linked payments e non ha stato write-off.
- `src/components/atomic-crm/invoices/invoiceVoidRules.ts` e
  `supabase/functions/_shared/invoiceVoid.ts`: void consentito solo per
  `in_attesa`/`scaduto`; uno stato write-off deve essere non voidable.
- `supabase/functions/_shared/invoiceImportConfirm.ts`: import pagamenti valida
  gli enum e re-settla gli expected emitted status-agnostic.
- `supabase/functions/_shared/invoiceImportExtract.ts`,
  `src/components/atomic-crm/ai/InvoiceImportDraftPaymentSection.tsx` e
  `src/components/atomic-crm/ai/PaymentDraftCard.tsx`: le superfici AI/import
  riusano o validano gli stati pagamento e non hanno metadata write-off.
- `src/components/atomic-crm/projects/quickPaymentReconciliation.ts`:
  incasso rapido settle-a solo quando il draft e' `ricevuto`.
- `src/components/atomic-crm/quotes/quotePaymentsSummary.ts`: i pagamenti
  collegati a preventivo oggi distinguono solo ricevuto/in_attesa/scaduto; un
  credito perso deve chiudere l'operativita' senza sembrare incassato.
- `scripts/check-prod-financial-health.mjs`: health oggi calcola pending anno con
  `status !== "ricevuto"`, quindi deve diventare controllore del nuovo stato.

### Ricerca prodotto/gestionali

Pattern ricorrente nei gestionali: una fattura non incassata non si marca come
pagata; si chiude il credito con write-off/bad debt/adjustment mantenendo
l'audit. Per questo progetto, in regime forfettario/cassa, il write-off e'
solo operativo: non genera costo deducibile e non entra nella fiscalita'.

## Opzioni valutate

### Opzione A - Nuovo stato `perso` su `payments` + metadata write-off

Estendere `payments.status` con `perso` e aggiungere:

- `writeoff_date DATE NULL`;
- `writeoff_reason TEXT NULL`;

con invariante: se `status = 'perso'`, data e motivo devono esistere.

Effetto:

- il record payment resta il record del credito atteso;
- non viene contato come cassa perche' resta diverso da `ricevuto`;
- puo' chiudere il saldo operativo se la vista sottrae anche il totale perso;
- UI, filtri, badge e show restano nel modello esistente dei pagamenti;
- audit minimo resta sul record che l'utente gia' capisce.

Costo:

- va propagato in tutti i consumer che usano `status !== ricevuto`;
- non modella write-off parziali multipli.

### Opzione B - Tabella dedicata `payment_writeoffs`

Creare una tabella `payment_writeoffs(payment_id, amount, writeoff_date,
reason, created_at, updated_at)` e calcolare il residuo operativo con una join.

Vantaggi:

- modello contabile piu' normalizzato;
- supporta write-off parziali o multipli.

Svantaggi:

- introduce una nuova resource, nuove CRUD/sheet, join e autorizzazioni;
- aumenta la propagazione UI/provider/AI;
- per il caso reale serve un solo write-off totale;
- nel sistema attuale `payments` e' gia' il record operativo del credito atteso,
  non esiste un ledger contabile completo.

### Opzione C - Spesa, credito ricevuto o nota negativa

Creare una spesa finta, un `credito_ricevuto`, o un pagamento negativo.

Scartata:

- falserebbe il dominio;
- rischierebbe fiscalita'/dashboard;
- confonderebbe "soldi persi" con "costo sostenuto" o "cash movement";
- viola la richiesta esplicita: niente spese/crediti finti.

## Decisione

Usare l'opzione A: nuovo stato pagamento `perso` con metadata write-off.

Motivazione:

- e' il cambiamento minimo che segue il modello esistente;
- evita un nuovo sottosistema contabile;
- non trasforma il credito in incasso;
- chiude il residuo operativo nella fonte canonica;
- rende il caso auditabile nella pagina pagamento;
- permette di propagare il comportamento con controllori chiari.

Nome DB: `perso`.

Label UI: "Credito perso".

Descrizione: "Credito dichiarato non incassabile: non e' cassa, non e'
fiscalita', chiude solo il residuo operativo."

Motivo per non usare `inesigibile` come valore DB: e' piu' formale ma meno
operativo per l'utente. Il termine "inesigibile" puo' comparire nella
descrizione, ma l'etichetta principale deve essere leggibile e breve.

## Invarianti di dominio

1. `ricevuto` e' l'unico stato che rappresenta cassa entrata.
2. `perso` non entra mai in `total_paid`, cash basis, fiscal estimate,
   cash-vs-competence o storico incassi.
3. `perso` chiude solo il residuo operativo: `balance_due` sottrae
   `total_written_off`, non lo confonde con `total_paid`.
4. `client_commercial_position` deve esporre almeno:
   - `total_paid`: cassa ricevuta;
   - `total_written_off`: credito perso operativo;
   - `balance_due`: saldo ancora aperto = `total_owed - total_paid -
     total_written_off`.
5. `project_financials` deve applicare la stessa semantica per non lasciare il
   progetto Aidone con residuo operativo aperto mentre il cliente risulta chiuso.
6. Un pagamento `perso` deve avere `writeoff_date` e `writeoff_reason`.
7. Un `rimborso` non puo' essere `perso`: un rimborso e' denaro in uscita, non
   credito cliente perso.
8. `payment_date` resta la data originale prevista/incasso; `writeoff_date` e'
   la data in cui l'operatore chiude il credito come perso.
9. Aidone `FPA 1/23` resta fattura storica e pagamento storico, ma con stato
   `perso` e metadata di write-off.
10. Aidone non viene collegata retroattivamente via `financial_document_id`
    finche' `invoice_import_confirm` usa quel FK come proxy di fattura
    app-emessa: quel path status-agnostic potrebbe re-settlare un credito perso
    a `ricevuto` al re-import dell'XML.
11. `invoice_void` non deve considerare `perso` voidable.
12. Import/emissione non generano automaticamente `perso`; lo stato e' una
    decisione operativa manuale o una migration/backfill esplicita.

## Superfici obbligatorie

### Database

- Migration additiva:
  - allargare `payments.status` CHECK a `perso`;
  - aggiungere `writeoff_date`;
  - aggiungere `writeoff_reason`;
  - aggiungere constraint per metadata quando `status = 'perso'`;
  - impedire `status = 'perso'` su `payment_type = 'rimborso'`;
  - aggiornare `project_financials` con `total_written_off`;
  - aggiornare `client_commercial_position` con `total_written_off`;
  - aggiornare Aidone `FPA 1/23` a `perso` con data/motivo deterministici
    (`writeoff_date = DATE '2026-06-22'`, motivo esplicito su mancato incasso).
- Seed:
  - allineare `supabase/seed_domain_data.sql` con le nuove colonne oppure
    creare un meccanismo post-seed versionato equivalente; il rebuild locale non
    deve tornare a `scaduto`.

### Tipi/provider

- `Payment.status` include `perso`;
- `Payment` include `writeoff_date` e `writeoff_reason`;
- `ProjectFinancialRow` include `total_written_off`;
- `ClientCommercialPosition` include `total_written_off`;
- nessun provider custom nuovo se ra-supabase gestisce gia' le colonne.

### Pagamenti

- Choices/labels/badge/export includono `perso`;
- list desktop e mobile mostrano il badge "Credito perso";
- filtri desktop e mobile includono "Credito perso";
- show mostra metadata write-off e non mostra CTA "Registra pagamento" o
  "Invia sollecito" per `perso`;
- edit/create espongono data/motivo solo quando `status = 'perso'`;
- validazione UI coerente con DB: se `perso`, data e motivo richiesti.
- `paymentLinking.ts` deve accettare `perso` solo se il form completo puo'
  richiedere i metadata; i link AI/launcher non devono generare status `perso`
  senza aprire la validazione completa.

### Clienti e progetti

- `ClientFinancialSummary` deve mostrare `total_written_off` quando maggiore di
  zero, separato da "Pagato" e "Da saldare".
- La lista clienti puo' continuare a mostrare solo il saldo operativo nella
  colonna "Da saldare", ma export/tipi non devono perdere `total_written_off` se
  viene usato in summary o AI.
- Le superfici progetto che consumano `project_financials.balance_due` devono
  beneficiare della view aggiornata senza ricalcolo locale.

### Dashboard/scaduti/solleciti

- `DashboardDeadlineTracker` deve fetchare solo `in_attesa` e `scaduto`, non
  genericamente `status != ricevuto`;
- `dashboardModel` pending/alerts deve escludere `perso`;
- `PaymentOverdueBadge` deve contare solo `in_attesa`/`scaduto` scaduti;
- `health:financial` deve escludere `perso` da pending e riportare/validare i
  write-off.

### Fatture

- `deriveDocumentCollectionState` deve supportare un documento collegato a
  pagamento `perso` con label "Credito perso", tone dedicato o non-overdue;
- `invoiceVoidRules` frontend e `_shared/invoiceVoid.ts` devono rifiutare
  `perso` come non voidable;
- per Aidone, che resta senza FK, le superfici Fatture devono usare un fallback
  read-only stretto solo per `payments.status = 'perso'` con stesso
  `client_id + invoice_ref/document_number`, cosi' la fattura storica mostra
  "Credito perso" senza diventare app-emessa o voidable.

### AI/analytics

- `unifiedCrmReadContext` deve escludere `perso` da pending e overdue;
- puo' esporre separatamente i crediti persi solo se serve audit, ma non deve
  confonderli con incassi attesi;
- `buildAnnualOperationsContext` resta fondato su
  `client_commercial_position.balance_due`; sottraendo `total_written_off` dalla
  view, la card/AI "Da incassare" si correggono senza seconda formula.
- `invoiceImportExtract` e `invoiceImportConfirm` non devono accettare/generare
  `perso` finche' l'import non supporta `writeoff_date` e `writeoff_reason`.
- `InvoiceImportDraftPaymentSection` deve filtrare "Credito perso" fuori dalle
  scelte import se `paymentStatusChoices` diventa globale.

### Preventivi

- `quotePaymentsSummary` deve distinguere `writtenOffCount` /
  `writtenOffTotal`. Il totale perso puo' chiudere il `remainingAmount`
  operativo, ma non deve aumentare `receivedTotal`, `pendingTotal` o
  `overdueTotal`.
- Le CTA di suggerimento pagamento non devono riproporre un importo gia'
  chiuso come `perso`.

### Documentazione

- `docs/CANTIERE.md`: aggiornare obiettivo attivo e gate;
- `docs/architecture.md`: nuova semantica payment status/view;
- `docs/development-continuity-map.md`: consumer e invarianti;
- `docs/historical-analytics-handoff.md`/backlog se AI/dashboard cambiano;
- `.claude/rules/learning.md` solo se emerge un nuovo trigger operativo.

## TDD / controllori richiesti

RED prima dell'implementazione:

1. DB/view test o script SQL versionato:
   - con un payment `perso` da 375, `total_paid` resta 0;
   - `total_written_off` diventa 375;
   - `balance_due` si riduce di 375 in `project_financials` e
     `client_commercial_position`;
   - constraint rifiuta `perso` senza metadata.
2. Unit `outstandingReceivables` o test view-consumer:
   - Aidone non contribuisce a `sumOutstandingReceivables` dopo la view.
3. Unit `dashboardDeadlineTrackerModel`:
   - `perso` non compare in overdue/due soon.
4. Unit `unifiedCrmReadContext`:
   - `perso` non incrementa pending/overdue AI.
5. Unit `financialDocumentHelpers`:
   - linked payment `perso` -> "Credito perso", non "Scaduta" e non
     "Da incassare".
6. Unit fatture fallback:
   - doc storico Aidone senza FK + payment `perso` stesso client/ref ->
     "Credito perso";
   - payment `scaduto` senza FK resta neutro/non app-emesso.
7. Unit frontend/EF void:
   - `perso` -> non voidable / `stato_inatteso` o reason dedicata.
8. Unit/tsx pagamenti:
   - show `perso` non mostra sollecito ne' registra pagamento;
   - metadata write-off visibile.
9. Unit quote summary:
   - `perso` aumenta `writtenOffTotal`, non `receivedTotal`, e non resta
     pending/overdue.
10. `scripts/check-prod-financial-health.mjs`:
   - pending non include `perso`;
   - Aidone write-off e' presente e cassa 2023 resta invariata.

Gate finali:

- `npm run test -- <suite mirate>`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run health:financial` dopo deploy/apply remoto;
- browser reale desktop e mobile se UI cambia;
- console browser senza errori bloccanti.

## Criteri di accettazione

1. Aidone `FPA 1/23` non compare piu' in:
   - card "Da incassare";
   - scaduti;
   - solleciti;
   - badge overdue.
2. Aidone non aumenta:
   - `total_paid`;
   - cassa 2023;
   - fiscal estimate;
   - cash-vs-competence;
   - analytics cash inflow.
3. Aidone resta visibile:
   - in pagamenti;
   - con stato "Credito perso";
   - con `writeoff_date`;
   - con `writeoff_reason`;
   - con `invoice_ref = FPA 1/23`;
   - con fattura storica ancora presente.
4. `client_commercial_position` distingue chiaramente pagato e perso.
5. `project_financials` non lascia residuo operativo aperto sul progetto Aidone.
6. Desktop e mobile mostrano lo stesso comportamento.
7. Nessuna spesa, credito finto, nota negativa o incasso artificiale viene
   creato.

## Stop point

Fermarsi prima dell'implementazione se:

- la review spec trova una superficie critica non inclusa;
- il DB non consente una migration additiva/replayable;
- il seed locale non puo' essere riallineato senza processo dedicato;
- un controllo richiede dati remoti distruttivi;
- la UI non riesce a rendere obbligatori i metadata `perso` senza rischio di
  salvare record invalidi.

## RAG e sweep gia' eseguiti

Indice code-RAG locale:

- collection: `code_197715e2`;
- chunks: 2648;
- lastUpdated: `2026-06-22T21:28:15.575Z`;
- policy check: PASS;
- Qdrant 400 logs: 0 dopo reindex precedente.

Query principali:

- payment statuses su dashboard/receivables/AI/reminders;
- invoice collection state/void/import/emit;
- payment UI choices/filters/types.

I claim RAG sono stati verificati sui sorgenti reali citati sopra.

## Review spec v1 - esito

Esito: PASS dopo correzioni v2.

Dimensioni controllate:

- Dominio: PASS. `perso` chiude un credito operativo senza creare cassa.
- DB/RLS: PASS con note. Nessuna nuova tabella, quindi RLS invariata; servono
  constraint additive e seed allineato.
- Money/fiscalita': PASS. `total_paid` resta solo `ricevuto`; `total_written_off`
  e' separato.
- Propagazione consumer: FIX APPLICATO. La v1 citava client view, pagamenti,
  fatture, dashboard e AI, ma mancavano `project_financials`,
  `quotePaymentsSummary` e le superfici import/AI che riusano gli status.
- Fatture/Aidone: FIX APPLICATO. La v1 lasciava ambigua la visibilita' in
  Fatture; v2 richiede fallback read-only per `perso` senza FK, evitando il
  rischio di `invoice_import_confirm`.
- Desktop/mobile: PASS come requisito, da dettagliare nel piano con browser
  reale e skill `impeccable`.
- Test/guardrail: PASS dopo estensione con quote, project view e fallback
  fatture.
- Governance/RAG: PASS. RAG usato e claim riverificati su sorgente.
- Operativita'/rollback: FLAG non bloccante. Il piano deve prevedere C1
  read-only/dry-run remoto prima di applicare la migration che riclassifica
  Aidone.
