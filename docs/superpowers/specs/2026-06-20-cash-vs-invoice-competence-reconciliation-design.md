# Spec — Layer di confronto Cassa vs Competenza data-fattura (riconciliazione col commercialista)

Stato: draft (in attesa review multi-superficie)
Data: 2026-06-20
Autore: agente (sessione post-BR2)
Origine: coda lavori "attribuzione data-fattura" sbloccata da BR2; decisione utente
2026-06-20 = **Layer confronto (no flip)**.

---

## 0. Decisione utente che vincola questa spec

`AskUserQuestion` 2026-06-20: opzione **"Layer confronto (no flip)"**.

- Il numero fiscale **legale/operativo resta CASSA** (`payments.payment_date`),
  immutato. È la legge per il forfettario (art. 1 c. 64 L. 190/2014, "ricavi
  percepiti"). Coerente col **FLIP 2026-06-20** registrato in
  `memory/project_fiscal_real_data_baseline.md` (Fabio dichiara per data-fattura =
  errore di principio; il tool non si adegua a Fabio).
- Si aggiunge una vista **read-only** che calcola, in parallelo e **isolata**, la
  base **competenza data-fattura** (`financial_documents.issue_date`) per
  **spiegare/riconciliare** la divergenza coi numeri dichiarati da Fabio.
- Conferma incrociata prose-RAG (`spec__2026-06-19-...calibration_part02`): la
  logica data-fattura va usata **solo** dentro lo strumento di confronto/previsione,
  il resto del sistema resta cassa.

NON è in scope cambiare la base fiscale a competenza ("Flip vero" = scartato).

## 1. Problema

L'utente non ha uno strumento per capire **perché** i suoi numeri (cassa, corretti
per legge) divergono da quanto il commercialista (Fabio) ha **dichiarato**
(competenza per data-fattura). Oggi deve fidarsi di Fabio o ricostruire a mano.

La divergenza è reale ma **piccola e localizzata**: misurata su prod
(`qvdmzhyzpyaveniirsmo`, read-only, 2026-06-20) riguarda **2 sole fatture
cross-year** sui 25 payment collegati da BR2:

| Fattura | Importo | Emessa (competenza) | Incassata (cassa) |
|---|---|---|---|
| FPR 10/23 (Gustare) | 4.500,00 | 2023 | 2024 |
| FPR 9/25 | 1.746,00 | 2025 | 2026 |

Tutti gli altri 23 payment collegati sono same-year. I 6 payment `ricevuto` **non**
collegati (no documento) sono tutti lontani dal confine d'anno (Mar/Nov/Feb/Apr/Mag)
→ nessun cross-year nascosto.

### 1.1 Prova quantitativa (perché vale la pena)

Riconciliazione misurata su prod, base = Σ `payments` `ricevuto` riassegnati per
anno-emissione (fallback cassa se non collegati):

| Anno | Cassa (tool, legge) | Competenza data-fattura | Fabio dichiarato | Δ vs Fabio |
|---|---|---|---|---|
| 2023 | 6.273,26 | 10.773,26 | 10.993 | −219,74 |
| 2024 | 13.740,18 | **9.240,18** | **9.240** | **+0,18** |
| 2025 | 24.954,35 | 26.700,35 | (aperto) | — |
| 2026 | 7.689,23 | 5.943,23 | (aperto) | — |

Il 2024 **riproduce il dichiarato di Fabio al centesimo** (9.240,18 ≈ 9.240) →
prova che il modello di riconciliazione è corretto e dà all'utente uno strumento di
verifica affidabile. Il 2023 resta a −219,74 (copertura `financial_documents`
incompleta, vedi §6).

## 2. Obiettivi

1. Una superficie read-only che mostra, per anno: **Cassa** (legge) vs **Competenza
   data-fattura** (Fabio), con il **Δ vs dichiarato** dove esiste una dichiarazione.
2. Il **ponte cross-year**: la lista delle fatture che "si spostano" tra anni
   (oggi 2: FPR 10/23 4.500 e FPR 9/25 1.746), così l'utente legge in chiaro
   *perché* cassa e competenza differiscono.
3. Riuso **esatto** della definizione di "ricavo tassabile" della stima fiscale
   esistente (no seconda verità): stesso signing + stesse esclusioni, cambia **solo**
   la data di attribuzione (issue_date invece di payment_date).
4. Parità desktop/mobile (UI-7) se reso come card dashboard.

## 3. Non-obiettivi

- NON modificare la base fiscale legale: zero cambi a `buildFiscalYearEstimate`,
  ai `FiscalKpis`, allo scadenzario, alla EF `fiscal_deadline_check`. (FLIP rispettato.)
- NON attribuire il numero fiscale per data-fattura. Solo confronto/diagnosi.
- NON riusare `analytics_yearly_competence_revenue`: aggrega da
  `services.service_date` (lavoro svolto, **terza** base), NON da
  `financial_documents.issue_date` — verificato su prod (`pg_get_viewdef`).
- NON inventare una seconda definizione di "tassabile" in SQL (le esclusioni
  vivono in `fiscalConfig`, non nel DB).
- NON toccare Aruba/SDI, né scrivere su `payments`/`financial_documents`.

## 4. Fonti di verità (verificate su sorgente reale)

- **Cassa basis** (canonico, da NON duplicare): `buildFiscalYearEstimate` in
  `src/components/atomic-crm/dashboard/fiscalModel.ts` + duplicato server
  `supabase/functions/_shared/fiscalDeadlineCalculation.ts`. Filtra `payments`
  `status='ricevuto'`, bucket `getBusinessYear(payment_date)`.
  - `getSignedPaymentAmount` (`fiscalModel.ts:123-126`): `rimborso` → importo negato.
  - `isPaymentExcludedByTaxabilityDefaults` (`fiscalModel.ts:142-167`): esclude per
    `nonTaxableClientIds` / `nonTaxableCategories` (da `fiscalConfig.taxabilityDefaults`).
- **FK BR2**: `payments.financial_document_id` → `financial_documents` (25 collegati,
  `ON DELETE SET NULL`, migration `20260616200000`). Lo `scaduto FPA 1/23` è
  escluso (FK NULL, per scelta BR2/DB-13).
- **Competenza data-fattura**: `financial_documents.issue_date` (solo `outbound`
  su prod). La riconciliazione usa l'issue_date **del documento collegato al
  payment**, non i totali `financial_documents` (incompleti, §6).
- **Note credito**: `financial_documents.document_type = 'customer_credit_note'`;
  helper esistente `isCreditNote`/`signedTotal` in
  `src/components/atomic-crm/invoices/financialDocumentHelpers.ts` (le sottrae).
- **Dichiarato Fabio**: ⚠️ `fiscal_declarations` (prod, verificato) contiene SOLO
  `total_substitute_tax`, `total_inps`, `prior_advances_*` — **NESSUN campo ricavo
  dichiarato / componenti positivi**. Quindi il "dichiarato Fabio" (10.993 nel 2023,
  9.240 nel 2024) **NON è derivabile dal DB**: sono oracoli noti dalle dichiarazioni
  AdE, usati **solo come fixture di test**, non come dato prod runtime. Conseguenza:
  v1 NON ha una colonna "Δ vs Fabio" alimentata dal DB (vedi D2).
- **Superfici dashboard**: hook `useDashboardData.ts`; desktop `DashboardAnnual.tsx`;
  mobile `MobileDashboard.tsx` (`MobileAnnualDashboard`); KPI `DashboardKpiCards.tsx`;
  AI card self-contained `DashboardAnnualAiSummaryCard`.

## 5. Decisioni di design

### D1 — Base competenza via helper TS puro, non via DB view

Un helper puro `buildCashVsInvoiceCompetenceReconciliation` (nuovo file
`dashboard/cashVsCompetenceReconciliation.ts`) che **importa e riusa**
`getSignedPaymentAmount` + `isPaymentExcludedByTaxabilityDefaults` (da esportare da
`fiscalModel.ts`), e bucketta ogni payment per
`getBusinessYear(issueDateById.get(payment.financial_document_id) ?? payment.payment_date)`.

Motivazione (SOLID/SYSTEM-FIRST): le esclusioni di tassabilità dipendono da
`fiscalConfig` (categoria/cliente), che non vive nel DB. Una SQL view
ri-implementerebbe quella logica → **seconda verità** soggetta a drift. L'helper
condivide la stessa identica definizione di "signed taxable payment"; cambia **solo**
la chiave-anno. Apples-to-apples garantito con la stima cassa.

Alternativa scartata: DB view `analytics_cash_vs_invoice_revenue`. Più AI-readable,
ma a livello GROSS (no esclusioni) → diverge dalla base tassabile quando esistono
esclusioni; secondo modello da tenere in parità. Riconsiderabile solo se nasce il
consumo AI/headless (BR3) — appuntato come follow-up, fuori da questo scope.

### D2 — Superficie: card dashboard read-only, desktop + mobile

Card "Cassa vs Competenza (commercialista)" sotto le KPI fiscali, resa sia in
`DashboardAnnual` sia in `MobileDashboard` con gli **stessi** input (UI-7).
Pattern "Approccio Bambino": due colonne (Cassa | Competenza), e sotto il ponte
cross-year ("FPR 10/23 4.500 € — incassata 2024, emessa 2023 → per legge conta
2024; Fabio l'ha messa 2023"). Compact mode su mobile per il dettaglio ponte.

**v1 senza colonna "Δ vs Fabio" da DB**: il ricavo dichiarato da Fabio non è in
`fiscal_declarations` (§4). La card mostra le due basi calcolate dal tool; la
colonna "Competenza" È la previsione di cosa Fabio dovrebbe aver dichiarato per
data-fattura. Il confronto col dichiarato reale resta a occhio dell'utente
(v1) o con entry manuale del dichiarato (v2, follow-up, fuori scope).

### D3 — Dati: riuso fetch esistenti + 1 fetch leggero

`useDashboardData` già carica `payments`, `projects`, `fiscalConfig`. Serve in più:
`financial_documents` (`id, issue_date, document_number, document_type`) per i doc
collegati (mappa id→issue_date) e `fiscal_declarations` per il Δ. Read-only via
`getList`/metodo provider esistente; nessuna nuova EF, nessuna migration.

## 6. Rischi e caveat (da dichiarare in UI, non nascondere)

- **Copertura `financial_documents` incompleta**: per il 2023 mancano ~219,74 € di
  ricavo che Fabio conta (doc non importati). La card deve mostrare la **copertura**
  (quanti payment dell'anno hanno un documento collegato) e NON spacciare la
  competenza per esatta quando la copertura < 100%. Il Δ vs Fabio è informativo.
- **Unlinked → resta su cassa-year** (fallback). Oggi 6 payment, nessuno cross-year;
  ma è un'approssimazione da documentare (se un doc futuro venisse collegato, l'anno
  potrebbe spostarsi).
- **Nota credito 200 € (2025)**: verificato su prod — il `customer_credit_note` 2025
  esiste come documento ma **NON ha alcun payment collegato** → è invisibile a
  ENTRAMBE le basi payment-based (no doppio conteggio, no sovrastima). (La `FPA 3/25`
  200 € è una `customer_invoice` `saldo` distinta.) Questo **rafforza** la scelta
  payment-based (D1): una base costruita dai totali `financial_documents` dovrebbe
  invece nettare la nota credito a mano. Caveat residuo: se in futuro nascesse un
  payment `rimborso` legato a una nota credito, il riuso di `getSignedPaymentAmount`
  lo netta già correttamente.
- **2026 YTD**: anno in corso, competenza parziale → etichettare come YTD, non
  confrontare con un "dichiarato" inesistente.
- **Tre basi da non confondere**: cassa (payment_date) ≠ competenza data-fattura
  (issue_date) ≠ competenza service-date (`analytics_yearly_competence_revenue`).
  La card riguarda solo le prime due.

## 7. Invarianti

1. **Conservazione**: `Σ_anni cassaTaxable == Σ_anni competenzaTaxable` (la
   riassegnazione sposta importi tra anni, non li crea/distrugge).
2. Ogni payment `ricevuto` contato **esattamente una volta** in entrambe le basi.
3. La definizione di "signed taxable payment" è **una sola** (riuso degli helper di
   `fiscalModel.ts`); nessuna ricodifica.
4. Zero scritture; zero modifiche alla base fiscale legale.

## 8. Criteri di accettazione (deterministici, oracoli da prod)

- Competenza 2024 (taxable) = **9.240,18**. (Riferimento di validazione, fixture di
  test: Fabio dichiarò 9.240 → +0,18. NON è un dato prod runtime.)
- Competenza 2023 = **10.773,26** (cassa 6.273,26 + FPR 10/23 4.500). (Fixture:
  Fabio 10.993 → −219,74, gap da copertura incompleta §6.)
- Cassa per anno invariata: 2023=6.273,26 · 2024=13.740,18 · 2025=24.954,35.
- Ponte cross-year = **esattamente 2 righe** (FPR 10/23 2024→2023 4.500; FPR 9/25
  2026→2025 1.746).
- Invariante conservazione verificata: Σ cassa == Σ competenza sull'intero dataset.
- Card visibile e con gli **stessi numeri** su desktop e mobile (UI-7).
- Base fiscale legale (KPI tasse, scadenzario) **invariata** rispetto a oggi
  (controllo di non-regressione: `fiscalParity.test.ts` resta verde, smoke
  `ef-reminder-parity` resta 9.005,91).

## 9. Controllori eseguibili (TDD money/fiscal)

- **RED→GREEN unit** sull'helper puro: oracoli §8 (2024=9.240,18, 2023=10.773,26,
  ponte 2 righe, conservazione). Falsificabile: cambiare il bucket da issue_date a
  payment_date → 2024 torna 13.740,18 → test rosso.
- **Component test** parità desktop/mobile (stessi numeri renderizzati).
- **Smoke prod read-only opzionale** (pattern `smoke:ef-reminder-parity`): legge prod
  e asserisce i 3 numeri competenza + il ponte. 0 scritture.
- **Non-regressione**: `fiscalParity.test.ts` + `npm run smoke:ef-reminder-parity`
  (9.005,91) invariati → prova che la base legale non è stata toccata.

## 10. Sweep superfici (Mandatory Surface Sweep — dashboard)

- helper + test → `dashboard/`
- card desktop → `DashboardAnnual.tsx`
- card mobile → `MobileDashboard.tsx` (UI-7, stessi props)
- hook dati → `useDashboardData.ts` (+ eventuale provider read-only)
- continuity docs → `historical-analytics-handoff.md` + `development-continuity-map.md`
- AI registry/snapshot → **non in scope v1** (follow-up BR3 headless)
- Settings → non toccato (non config-driven)

## 11. Domande aperte per la review

1. ~~Campo `fiscal_declarations` per il dichiarato~~ → RISOLTO: non esiste (§4).
   v1 senza Δ-da-DB. Confermare in review se la card debba prevedere un'entry
   manuale del dichiarato (v2) o restare solo Cassa-vs-Competenza.
2. La card va sotto le KPI fiscali o dentro `DashboardHistoricalAiCard`/storico?
   (Proposta: card dedicata sotto KPI fiscali, current+past year.)
3. Mostrare il Δ vs Fabio solo per anni con dichiarazione chiusa, o sempre con
   etichetta "stima"? (Proposta: solo anni chiusi; aperti = "—".)

---

## 12. Esiti review multi-superficie (2026-06-20) — vincoli BINDING per il piano

4 revisori specializzati, ognuno con RAG :8001 + verifica sorgente. Verdetti:
**Fiscale PASS** · **DB PASS** · **Frontend PASS** · **TDD FLAG**. Nessun BLOCK di
design. I "BLOCK" TDD sono requisiti del PIANO (controllori non ancora falsificabili
come scritti). Tutti gli oracoli verificati al centesimo su prod; conservazione
Σ cassa == Σ competenza == **52.657,02** confermata.

Refinements vincolanti (il piano DEVE operazionalizzarli):

### Fiscale
- **F-fisc-5 (alta) — wording difensivo come criterio di accettazione**: la card
  DEVE rendere non-ambiguo che CASSA = "il tuo numero per legge" e COMPETENZA =
  "come la vede il commercialista, spiegazione, NON da dichiarare". Riga di sintesi
  Approccio-Bambino. Asserito nel component test (presenza etichetta "per legge"
  sulla colonna cassa). Senza, la feature anti-frizione diventa anti-fiscale.
- **F-fisc-6 (media) — copertura numerica per anno**: competenza con copertura <100%
  etichettata "stima parziale", mai "il numero di Fabio" (DB-11/DOM-4: linkage ≠
  verità). Criterio di accettazione + test.
- **F-fisc-4/9 (bassa) — caveat §6**: il signing eredita il comportamento cassa
  (`rimborso_spese` NON negato, oggi inerte: 0 rimborsi su prod) — coerente tra le
  due basi by-design. Aggiungere caveat: la base confronta solo ricavi forfettari
  del CRM; NASPI/co.co.co/ritenute fuori base (non confondere col reddito complessivo).

### DB
- **F-db-1 (media) — export = file base-legale**: aggiungere SOLO `export` ai 2 helper
  in `fiscalModel.ts`, senza spostare/rinominare (no refactor consumer). Export solo
  client; il duplicato Deno `_shared/fiscalDeadlineCalculation.ts` NON va toccato (card
  = solo UI). Guardrail non-regressione obbligatorio (vedi TDD).
- **F-db-2 (bassa) — copertura 2026 asimmetrica**: 2026 ha solo 1/4 payment collegati
  → competenza 5.943,23 è stima 25%. Badge/barra copertura per OGNI anno, non solo 2023.

### Frontend
- **F-fe-1/2 (alta) — UN solo componente condiviso** `CashVsCompetenceCard` con prop
  `compact`, importato in `DashboardAnnual.tsx` E `MobileDashboard.tsx` (dentro il
  blocco `data.fiscal`), STESSI props da `useDashboardData`. VIETATO duplicare markup
  in `MobileFiscalKpis`. Caso aggiunto a `MobileDashboard.parity.test.tsx` (falsificabile).
- **F-fe-3 (media) — provider-first**: fetch via `useGetList("financial_documents_summary")`
  (view GIÀ registrata `dataProvider.ts:66`, espone `id/issue_date/document_number/
  document_type/direction`), filtro `direction='outbound'`, costruire mappa id→issue_date.
  NON la tabella raw `financial_documents` (non registrata). Nessuna migration/EF.
- **F-fe-4 (media) — wording**: titolo user-oriented (es. "Perché i miei numeri
  differiscono da quelli del commercialista"), microcopy 1 riga, colonna sx "Cassa
  (tu, per legge)" / dx "Data fattura (commercialista)". Pattern disclaimer come
  `DashboardAnnual.tsx:199-203`.
- **F-fe-5 (media) — copertura = progress bar, non badge** (CLAUDE.md Approccio Bambino
  §5/§7); YTD = label inline (no badge-footnote).
- **F-fe-6 (bassa) — compact collapsible** per il dettaglio ponte (pattern
  `DashboardAnnualAiSummaryCard.tsx:127,208-221`, `useState(!compact)` + Chevron);
  le 2 colonne + barra risultato SEMPRE visibili anche in compact.

### TDD (i 3 BLOCK-sui-controllori del revisore — il piano li chiude PRIMA del codice)
- **T-1 (BLOCK) — fixture falsificabile**: l'unit dell'helper DEVE contenere le 2
  fatture cross-year + ≥1 same-year, con asserzione che lega `bucket===getBusinessYear(
  issueDate)` (es. `competenza[2023]` include i 4.500, `cassa[2023]` no). Aggiungere il
  caso anti-regressione: con bucket=payment_date → `competenza[2024]===cassa[2024]===
  13.740,18` deve FALLIRE. Senza cross-year nella fixture la mutazione non falsifica.
- **T-2 (BLOCK) — stesso simbolo, no copia**: test che importa `getSignedPaymentAmount`
  da `fiscalModel.ts` e verifica che l'helper produca lo STESSO segno su `rimborso` e
  `rimborso_spese`; vieta la ri-scrittura inline del signing (drift silenzioso).
  L'helper applica esclusione POI signing, stessa sequenza di `buildFiscalYearEstimate`.
- **T-3 (BLOCK) — property-test conservazione**: su N dataset random, `Σ valori cassa
  === Σ valori competenza` (su GREZZI non arrotondati, vedi T-5). Unico controllore che
  cattura perdite/duplicazioni fuori dagli anni oraclati (§7.1/§7.2).
- **T-4 (FLAG) — lista non-regressione esplicita**: `fiscalModel.test.ts` resta verde
  (vero guard dei KPI cassa per-anno) IN AGGIUNTA a `fiscalParity.test.ts` +
  `smoke:ef-reminder-parity`=9.005,91. I primi due da soli non bastano.
- **T-5 (FLAG) — rounding**: conservare i grezzi non arrotondati per l'invariante;
  arrotondare solo al display (`roundFiscalOutput` arrotonda per-anno → Σ può divergere
  di centesimi, cugino WF-20). Property-test su grezzi o tolleranza < numAnni×0,005.
- **T-6 (FLAG) — 5 rami unit obbligatori**: rimborso-cross-year (segno migra), esclusione
  tassabilità (escluso da ENTRAMBE le basi), unlinked→fallback cassa, doc multi-payment
  (1:N, ogni payment 1 volta), YTD 2026 (no confronto-dichiarato).
- **T-7 (FLAG) — smoke prod OBBLIGATORIO** (read-only, WF-19 N/A): assert i 3 numeri
  competenza + **ponte = esattamente 2 righe** (FPR 10/23, FPR 9/25) = guard del caveat
  §6 (un unlinked che si collega sposta un anno).

### Domande aperte risolte dalla review
- §11.1 (campo dichiarato): RISOLTO, non esiste → v1 senza Δ-da-DB.
- §11.2 (collocazione): dentro il blocco `data.fiscal`, dopo le KPI fiscali, gating
  identico desktop/mobile (F-fe-1, F8).
- §11.3 (Δ solo anni chiusi): N/A in v1 (niente Δ-da-DB); la copertura per-anno è il
  segnale di affidabilità.
