# Spec — Calibrazione della stima fiscale sull'aliquota effettiva reale

Stato: draft (in attesa review multi-superficie)
Data: 2026-06-19
Autore: agente (sessione Ciclo 2 fiscale)
Origine: assessment `docs/superpowers/2026-06-15-gestionale-assessment.md` finding
#3, #4, #13; richiesta utente esplicita in sessione.

---

## 1. Problema

La dashboard mostra all'utente quanto dovra' pagare di tasse (card "Tasse
stimate", "Accantona al mese") e il calendario saldo/acconti. Questi numeri sono
calcolati con una **formula teorica forfettaria**:

- `forfettarioIncome = cassa_tassabile × coefficiente (78%)`
- `INPS = forfettarioIncome × aliquotaINPS (26,07%)`
- `imposta = (forfettarioIncome − INPS_stimato) × aliquotaSostitutiva (5%/15%)`

Verificato su sorgente reale:
- client: `src/components/atomic-crm/dashboard/fiscalModel.ts:256-289`
  (`buildFiscalYearEstimate`).
- Edge Function (duplicato byte-identico):
  `supabase/functions/_shared/fiscalDeadlineCalculation.ts:473-490`.

### Prova quantitativa sui dati reali di produzione (2024 chiuso e riconciliato)

Fonte: `fiscal_declarations` prod (`qvdmzhyzpyaveniirsmo`, read-only), nota DB:
*"Totali riconciliati 2026-04-14 contro F24 AdE"*.

| Voce | Formula teorica | Reale commercialista | Scarto |
|---|---|---|---|
| INPS | 2.794 € (26,07%) | **3.667,40 €** | **−24%** (#4) |
| Imposta sostitutiva | 396 € (5%) | **233 €** | **+70%** (#3) |
| Totale tasse | 3.190 € (23,2% su cassa) | **3.900,40 € (28,39%)** | **−18%** |

Cassa 2024 = 13.740,18 € (`payments` status=ricevuto). L'aliquota effettiva
reale 2024 = `3.900,40 / 13.740,18 = 28,39%`, contro un teorico ~23%.

Conseguenza operativa: per l'anno in corso (nessuna dichiarazione ancora chiusa)
il sistema indica di **accantonare ~18% in meno** del dovuto reale. Con cassa
2025 quasi doppia (24.954,35 €) il buco assoluto stimato supera i 3.000 €.

### Causa radice (perche' la formula non puo' azzeccare)

L'INPS reale non e' una percentuale pulita del reddito dell'anno: include
**acconti calcolati sull'anno precedente**, **conguagli** e l'effetto di anni
atipici (il 2023 di Rosario aveva NASPI + co.co.co). Una formula
`reddito × aliquota` non puo' ricostruire quel numero. Inseguire la formula e' un
vicolo cieco strutturale.

### Tensione documentale da risolvere

Due intenti interni si contraddicono:
- la memoria `project_fiscal_real_data_baseline.md` prescrive: *"usare aliquota
  effettiva reale, non formula teorica"*;
- la nota della dichiarazione 2025 in DB dice: *"la dashboard calcola i saldi e
  gli acconti 2026 usando la formula"*.

Questa spec **risolve la tensione a favore dell'aliquota reale** (la memoria) e
deprecca l'intento "usa la formula" della nota.

---

## 2. Obiettivi

1. **Calibrare la stima sull'aliquota effettiva reale** ricavata dall'ultima
   dichiarazione reale chiusa, mantenendo separati i due componenti (INPS e
   imposta) perche' servono al calendario acconti.
2. **Rendere leggibile in anticipo "quanto pagherò alla prossima scadenza,
   saldo + acconto compreso"**, con etichetta chiara `stima` vs `definitivo`.
3. **Confronto stima ↔ commercialista**: quando arriva il numero reale di Fabio,
   l'utente deve poter confrontare la stima del sistema con la cifra vera, per
   verificare da solo l'affidabilita'.
4. **Eliminare il rischio di drift** tra calcolo client e calcolo Edge Function
   (#13), mantenendo verde il controllore di parita' gia' esistente.
5. **Parita' desktop/mobile** su tutti i numeri fiscali toccati (UI-7).

## 3. Non-obiettivi

- NON ricostruire il metodo ufficiale esatto degli acconti (percentuali AdE,
  rateazioni, minimali per ogni gestione): l'autorita' resta il commercialista.
  Il sistema resta una **stima di pianificazione**, non un sostituto del
  commercialista. Si mantiene l'attuale euristica acconti (INPS 80% in 2 rate,
  imposta 100% con split secondo soglia).
- NON rimuovere la formula teorica: resta come **fallback** per anni senza alcuna
  dichiarazione reale chiusa (es. primo anno di attivita').
- NON toccare lo storage di `fiscal_declarations` / `fiscal_obligations` ne' la
  reality-merge (`buildFiscalRealityAwareSchedule`): gia' corretti, sostituiscono
  le stime con i dati reali quando presenti.
- NON toccare fatturazione, Aruba, SDI, XML.
- NON adottare il modello doppia partita `cash_movements` (escluso
  dall'assessment per single-user forfettario).

## 4. Fonti di verita'

1. **Dati reali commercialista**: `fiscal_declarations` (campi `tax_year`,
   `total_substitute_tax`, `total_inps`, `prior_advances_*`). Una dichiarazione
   e' "chiusa/affidabile" se ha totali annuali non-zero
   (`total_substitute_tax + total_inps > 0`). NB: la dichiarazione 2025 ha totali
   ZERO intenzionali → NON affidabile come baseline finche' Fabio non la chiude.
2. **Cassa reale**: `payments` status=`ricevuto`, `payment_date`, principio di
   cassa (DOM-1), aggregata per anno di business (`getBusinessYear`, WF-8).
3. **Obblighi reali**: `fiscal_obligations` (saldo/acconti gia' certi) — restano
   la verita' quando esistono, via reality-merge.
4. **Sorgente codice** (non i docs): i file elencati in §6.

## 5. Decisioni di design

### D1 — Calibrazione per-componente, ogni aliquota sulla SUA base (rev. post-review)

> Correzione da review fiscale (FLAG ALTA): NON calibrare sulla cassa. L'INPS si
> calcola sul **reddito forfettario** (cassa×coeff) e l'imposta sul **reddito
> dopo deduzione INPS**. Calibrare ogni aliquota sulla base corretta la rende
> robusta al variare di coefficiente / mix ATECO. Calibrare sulla cassa
> funzionerebbe "per caso" solo se il coefficiente resta identico ogni anno.

Dall'ultima dichiarazione reale chiusa (anno `Yd`) si ricavano DUE aliquote
effettive, ciascuna sulla base su cui quel tributo realmente insiste:

```
forfettarioIncome(Yd)      = taxable_cash(Yd) × coefficiente(Yd)
taxableAfterInps(Yd)       = forfettarioIncome(Yd) − decl.total_inps

rate_inps    = decl.total_inps           / forfettarioIncome(Yd)
rate_imposta = decl.total_substitute_tax / taxableAfterInps(Yd)
```

Per l'anno stimato `Y` (senza dichiarazione chiusa) si applicano alle basi
proiettate di `Y` (calcolate con il coefficiente di `Y`):

```
forfettarioIncome(Y)         = taxable_cash(Y) × coefficiente(Y)
annualInpsEstimate           = forfettarioIncome(Y) × rate_inps
taxableAfterInps(Y)          = forfettarioIncome(Y) − annualInpsEstimate
annualSubstituteTaxEstimate  = taxableAfterInps(Y) × rate_imposta
```

Verifica sui numeri reali (calibrazione su 2024 → proiezione 2025):
- `forfettarioIncome(2024) = 13.740,18 × 78% = 10.717,34`;
- `rate_inps = 3.667,40 / 10.717,34 = 34,22%` → INPS 2025 =
  `19.464,39 × 34,22% = ~6.661 €`;
- `taxableAfterInps(2024) = 10.717,34 − 3.667,40 = 7.049,94`;
- `rate_imposta = 233 / 7.049,94 = 3,305%` → imposta 2025 =
  `(19.464,39 − 6.661) × 3,305% = ~423 €`;
- totale 2025 ~7.084 € = `24.954,35 × 28,39%`. Coerente con la memoria e con il
  ballpark della calibrazione-su-cassa, ma ora robusto al coefficiente.

Mantenere i due componenti separati garantisce che `fiscalDeadlines.ts`
(saldo+acconto, INPS 80% / imposta 100%) continui a funzionare senza modifiche.

**Perche' per-componente e non aliquota unica**: il calendario acconti applica
percentuali diverse a INPS (80%) e imposta (100%); servono i due numeri
separati, non solo il totale.

**Nota su `rate_inps = 34,22%` (anomala vs GS ~26%)** (review fiscale): il dato
reale 2024 e' alto perche' include l'effetto di conguaglio/acconti calcolati sul
2023 atipico (NASPI + co.co.co). Proiettarlo sul 2025 e' **volutamente
prudenziale** (erra verso l'alto sull'INPS → l'utente accantona di piu', mai di
meno: lato sicuro per la liquidita'). Il rischio resta gestito da: etichetta
`stima`, confronto con Fabio (D5), e baseline che si auto-corregge appena la
dichiarazione 2025 (anno "puro") diventa la nuova piu' recente chiusa. Vedi R1.

### D2 — Selezione della baseline e fallback

- Baseline = dichiarazione reale **chiusa piu' recente** con `tax_year < Y` e
  totali non-zero. Tipicamente la piu' recente disponibile.
- Se `taxable_cash(Yd) <= 0` (denominatore nullo) → impossibile calibrare → usare
  fallback teorico.
- Se NON esiste alcuna dichiarazione chiusa → fallback alla formula teorica
  attuale (primo anno).
- Esporre il "metodo" usato come campo nel risultato:
  `estimateMethod: "calibrated_effective_rate" | "theoretical_formula"` e una
  `confidence` (`calibrated` > `theoretical`). Questo guida l'etichetta UI.

### D3 — Anni con dichiarazione reale (passato): nessuna doppia verita'

Per un anno `Y` che HA gia' la sua dichiarazione reale chiusa, le card KPI NON
devono mostrare la stima: devono mostrare i **totali reali** della dichiarazione
(`total_inps`, `total_substitute_tax`), coerenti con lo scadenzario gia'
reality-aware. (Oggi le card KPI mostrano sempre il teorico anche per gli anni
chiusi — bug collaterale da chiudere.)

### D4 — Card "Prossima scadenza, tutto compreso"

Riusare/estendere `DashboardDeadlineTracker` + `DashboardDeadlinesCard` (gia'
reality-aware) per esporre in modo prominente, per la prima scadenza futura
ad alta priorita':
- totale tutto compreso (`totalAmount` / `totalRemaining`),
- breakdown saldo vs acconto (gia' nei `items` per `component`),
- etichetta `stima (calibrata)` / `stima (teorica)` / `definitivo (reale)`.

Decisione UI di dettaglio (layout, copy "Approccio Bambino") demandata al piano +
skill `impeccable`. La spec fissa solo il contenuto informativo minimo.

### D5 — Confronto stima ↔ reale (per "lo confronteremo con Fabio")

L'infrastruttura esiste gia': `buildFiscalRealityAwareSchedule` produce
`estimateComparison` (somma delle stime originali quando esistono dati reali). Il
piano deve renderlo visibile come confronto esplicito "stima sistema vs reale
commercialista" sulla scadenza/anno, quando una dichiarazione reale viene
inserita (`DichiarazioneEntryDialog`). Nessuna nuova tabella.

### D6 — #13 drift client/EF

La calibrazione cambia `buildFiscalYearEstimate` in DUE runtime (client TS + Deno
EF). Vincolo: la modifica va applicata a ENTRAMBE le copie e il controllore
`fiscalParity.test.ts` (gia' esistente, importa client + server) deve restare
verde. Valutare nel piano se estrarre la logica di calibrazione in un input
condiviso (es. passare `effectiveRates` gia' calcolati come parametro) per ridurre
la duplicazione, senza rompere la separazione dei runtime.

## 6. Superfici impattate (verificate su sorgente)

| # | File | Ruolo | Modifica |
|---|------|-------|----------|
| 1 | `dashboard/fiscalModel.ts` (`buildFiscalYearEstimate`) | stima client | inietta aliquote calibrate + metodo/confidence |
| 2 | `_shared/fiscalDeadlineCalculation.ts` (`buildFiscalYearEstimate`, `buildFiscalReminderComputation`) | stima EF | stessa modifica, parita' |
| 3 | `dashboard/fiscalModel.ts` (`buildFiscalModel`) | orchestratore | passa la dichiarazione/baseline alla stima |
| 4 | `dashboard/fiscalModelTypes.ts` | tipi | nuovo `estimateMethod`/`confidence` su `FiscalKpis` |
| 5 | `dashboard/DashboardFiscalKpis.tsx` | card KPI | mostra reale se anno chiuso (D3) + etichetta stima/definitivo |
| 6 | `dashboard/DashboardDeadlineTracker*` / `DashboardDeadlinesCard.tsx` | scadenzario | totale "tutto compreso" + label (D4) |
| 7 | `dashboard/MobileDashboard.tsx` | mobile | parita' UI-7 dei numeri sopra |
| 8 | `dashboard/useFiscalReality.ts` / `providers/.../fiscalRealityProvider.ts` | fetch reale | fornire la dichiarazione baseline alla stima |
| 9 | `supabase/functions/fiscal_deadline_check/index.ts` | reminder | consuma stima calibrata (no codice nuovo se la calibrazione e' nel builder condiviso) |
| 10 | `lib/semantics/crmSemanticRegistry.ts` | AI | aggiornare descrizione: stima calibrata su dichiarazione reale, non formula |
| 11 | `dashboard/DichiarazioneEntryDialog.tsx` | input Fabio | trigger confronto stima↔reale (D5) |
| 12 | `dashboard/fiscalParity.test.ts` | controllore | estendere ai nuovi rami, deve restare verde |

Sweep obbligatoria (Mandatory Surface Sweep dashboard + AI): list/create/edit/
show non si applicano (no resource CRUD); si applicano dashboard desktop+mobile,
AI registry, continuity docs.

## 7. Invarianti

- **INV-1 (cassa)**: la base resta `payments` ricevuti per anno di business; mai
  `services` (DOM-1).
- **INV-2 (non-negativi)**: ogni output fiscale `max(0, …)`.
- **INV-3 (parita' client/EF)**: `buildFiscalYearEstimate` client ≡ EF a parita'
  di input (`fiscalParity.test.ts` verde).
- **INV-4 (reality wins)**: dove esistono `fiscal_obligations` reali, il merge
  continua a sostituire la stima (nessuna regressione su scadenzario passato).
- **INV-5 (split preservato)**: la stima espone sempre INPS e imposta separati,
  cosi' il calendario acconti non cambia comportamento.
- **INV-6 (etichetta onesta)**: ogni numero fiscale a schermo dichiara se e'
  `definitivo` (reale) o `stima` (calibrata/teorica). Mai una stima spacciata per
  definitivo.
- **INV-7 (timezone)**: anno di business e date-only via `dateTimezone` (WF-8/9/10).

## 8. Rischi

- **R1**: calibrazione su un solo anno potenzialmente atipico (2024 include
  acconti su 2023 atipico). Mitigazione: e' comunque molto piu' accurata del
  teorico (28,4% vs 23%), etichettata `stima`, e confrontabile con Fabio (D5).
  La memoria endorsa esplicitamente l'uso del 2024 come baseline.
- **R2**: doppia copia formula (client/EF) → drift. Mitigazione: parity test
  obbligatorio verde (INV-3).
- **R3**: dati finanziari errati su mobile (UI-7). Mitigazione: sweep + controllo
  esplicito che `MobileDashboard` riceva gli stessi numeri.
- **R4**: regressione su anni chiusi (D3 cambia cosa mostrano le KPI per il
  passato). Mitigazione: controllore che per 2024 le KPI mostrino i totali reali
  (3.900,40) e per l'anno in corso la stima calibrata.
- **R5**: AI che, in futuro, legge numeri fiscali diretti deve usare la stessa
  fonte calibrata (oggi l'AI ha solo conoscenza concettuale via registry). Nota
  per non creare seconda verita'.
- **R6**: la nota della dichiarazione 2025 ("usa la formula") resta nel DB e puo'
  rifondare l'intento sbagliato. Mitigazione: aggiornare la nota/doc canonica.

## 9. Criteri di accettazione

- **AC1**: con la dichiarazione reale 2024 presente, la stima INPS 2025 = cassa
  2025 × `rate_inps(2024)` (≈ 6.661 €) e imposta 2025 ≈ 423 € (NON 5.074 / 719
  teorici). Errore complessivo vs reale entro tolleranza di centesimi sulla
  formula, non sull'aliquota reale di Fabio.
- **AC2**: per il 2024 (anno chiuso) le card KPI mostrano i **totali reali**
  (INPS 3.667,40, imposta 233), non il teorico.
- **AC3**: la card scadenza mostra, per la prima scadenza futura, il totale tutto
  compreso con breakdown saldo/acconto e label `stima`/`definitivo`.
- **AC4**: `fiscalParity.test.ts` verde dopo la modifica (client≡EF).
- **AC5**: stessi numeri fiscali su desktop e `MobileDashboard` (UI-7).
- **AC6**: rimuovendo (in test) la dichiarazione baseline, la stima ricade sul
  teorico e l'etichetta diventa `stima (teorica)` — falsificabilita' del ramo.
- **AC7**: `typecheck`, `lint`, `build`, `continuity:check` verdi; `deno check`
  sull'EF; smoke cross-timezone sulle date-only (WF-9).

## 10. Controllori (MONEY/FISCAL TDD — RED prima dell'impl)

- **C1 (RED→GREEN, cuore money)**: unit test su `buildFiscalYearEstimate` con
  fixture inline = dichiarazione 2024 reale + cassa 2025. RED ora: il sistema
  produce ~5.074 INPS (teorico). GREEN dopo: ~6.661 INPS (calibrato). Asserire
  entrambi i componenti.
- **C2**: estendere `fiscalParity.test.ts` ai rami calibrato + fallback (INV-3).
- **C3 (falsificabile)**: test che, tolta la dichiarazione baseline, forza il
  fallback teorico + `estimateMethod = "theoretical_formula"` (AC6).
- **C4 (anno chiuso)**: test che per il 2024 le KPI usano i reali (AC2/D3).
- **C5 (UI)**: component test desktop + mobile che il numero calibrato e la label
  arrivano alle card (UI-7); WF-9 smoke cross-timezone sulle date scadenza.
- **C6 (e2e, opzionale)**: smoke deterministico con dati demo + cleanup
  `finally` (WF-19) se serve oltre i component test.

Tutte le fixture sono **inline** (no fixture condivise di dominio, SYSTEM-FIRST);
i numeri reali di Rosario sono usati come riferimento di verifica, non hardcoded
come seed.

## 11. Relazione con la roadmap / assessment

Copre #3 (imposta deduce INPS stimato → ora la stima e' calibrata sul reale),
#4 (INPS sotto-stimata → aliquota reale), #13 (drift client/EF → parity test
esteso). Ciclo 2 dell'assessment. #18 (obblighi senza stima) resta follow-up.

## 12. Domande aperte — RISOLTE in review

- **Q1 (baseline singola vs media multi-anno)** → **singola, la piu' recente
  chiusa**. No media: finche' l'unica baseline e' un 2024 atipico, una media
  introdurrebbe ulteriore rumore. La baseline si auto-corregge appena Fabio
  chiude il 2025 (anno "puro"). Aliquota-su-base-corretta (D1) + label
  prudenziale gestiscono R1.
- **Q2 (anni chiusi: solo reale o reale + "stima era X")** → **reale come
  numero principale + confronto "CRM stimava X" gia' disponibile**
  (`estimateComparison`, gia' renderizzato in `DashboardDeadlinesCard` riga
  ~494). Nessun nuovo componente.
- **Q3 (calibrazione condivisa vs duplicata)** → **estrarre il SOLO calcolo
  `effectiveRates` (rate = total/base) in una funzione pura, duplicata-per-
  runtime ma con stesso input; la SELEZIONE della baseline NON va duplicata**.
  Riduce la superficie di drift a un singolo punto di input; il parity test
  resta valido. Vedi D6 aggiornato e D7.

## 13. Esiti review multi-superficie (2026-06-19) e modifiche incorporate

4 revisori specializzati, ognuno con RAG (:8001 codice, :8002 prosa) + verifica
sul sorgente reale. Verdetti: **fiscale FLAG, DB/backend FLAG, frontend/mobile
FLAG, TDD PASS**. Nessun BLOCK → direzione confermata. Finding incorporati
(vincolanti per il piano):

### Già applicato in questa revisione
- **D1 corretto** (fiscale ALTA): calibrazione per-componente su base corretta
  (INPS su reddito forfettario, imposta su reddito-netto-INPS), non sulla cassa.
- **R1 rafforzato**: il `rate_inps` reale ~34% e' prudenziale (conguaglio 2023
  atipico); accettato perche' erra a favore della liquidita' e si auto-corregge.

### Decisioni aggiuntive (amendano §5/§6 — il piano DEVE rispettarle)

**D7 — Flusso dati e firme (DB/backend F1+F2, TDD)**
- Client: `buildFiscalModel` e `buildFiscalYearEstimate` ricevono un nuovo input
  opzionale `calibration` (es. `{ effectiveRates, sourceYear } | null`). NON
  fanno fetch: l'orchestratore (`useFiscalReality` / `DashboardAnnual`) passa la
  baseline. Oggi `DashboardAnnual` fetcha solo `getFiscalDeclaration(year-1)`:
  generalizzare a "ultima dichiarazione chiusa con totali non-zero".
- Edge Function: `fiscal_deadline_check` oggi **non** carica `fiscal_declarations`
  → AGGIUNGERE il fetch (`supabaseAdmin.from("fiscal_declarations")`) e passare la
  baseline a `buildFiscalReminderComputation` → `buildFiscalYearEstimate`. Senza,
  i promemoria userebbero il teorico mentre la dashboard usa il calibrato
  (divergenza DOM-5). Assunzione single-user dichiarata (service-role, no
  filtro `user_id`).
- TDD: i test passano la `calibration` come **parametro inline**, non via fetch
  (C1/C2 disaccoppiati dal provider). Decidere la firma PRIMA di scrivere C1.

**D6 aggiornato (#13)** — estrarre `computeEffectiveRates(declaration, coeff)`
pura, duplicata client/EF ma input identico; `fiscalParity.test.ts` esteso a
scenario calibrato + fallback. La logica di SELEZIONE baseline vive in un solo
posto per runtime, non duplicata dentro il builder.

**Superfici mancanti aggiunte a §6** (frontend MEDIA):
- `dashboard/DashboardNetAvailabilityCard.tsx` ("quanto ti resta in tasca"):
  `taxReserve = stimaInps + stimaImposta` (fallback `totalOpenObligations`).
  Consumer fiscale non elencato → per anni chiusi deve usare il reale come le
  altre card (AC5). Usata da desktop e mobile via `DashboardKpiCards`.
- `dashboard/MobileFiscalKpis.tsx`: su mobile NON esiste l'equivalente di
  `DashboardFiscalKpis`; mostra solo accantonamento/tetto (NON INPS/imposta) →
  rischio parita' asimmetrica. Il piano deve garantire che mobile e desktop
  derivino i numeri calibrati dalla STESSA fonte (`fiscalModel`), non da due
  build separate.
- Naming `confidence`: esiste gia' `FiscalScheduleConfidence = "estimated"` su
  schedule/deadline (consumato da `fiscalParity.test.ts`). Il nuovo
  `estimateMethod: "calibrated_effective_rate" | "theoretical_formula"` va come
  **campo separato**, non sovrascrivere `FiscalScheduleConfidence`.

**D4 / D5 — estendere, non creare** (frontend BASSA): `DashboardDeadlinesCard`
ha gia' breakdown per componente, badge `Stimato`/`Da dichiarazione`/`Versato`,
`totalRemaining` ed `estimateComparison` (riga "CRM stimava:"). Aggiungere solo
il sotto-livello `calibrata` vs `teorica` al badge `Stimato`.

### Controllori — addenda (§10, da TDD + frontend)
- **C1**: confermato RED reale (oggi `buildFiscalYearEstimate` non riceve nemmeno
  la dichiarazione → produce il teorico ~5.074). GREEN passa `calibration` inline.
- **WF-20**: tutti gli assert money su **numeri** (`fiscalKpis.*Estimate` come
  number, tolleranza centesimi) o regex grouping-agnostica (`/6\.?661/`), MAI su
  stringhe `toLocaleString` → evita falso-rosso Node small-ICU.
- **C7 (nuovo)**: controllore che il reminder EF (`buildFiscalReminderComputation`
  / `scheduleScenarios`) usa la stima CALIBRATA, non il teorico (chiude la
  divergenza F2/DOM-5).
- **C8 (nuovo)**: controllore falsificabile "stessa fonte desktop≡mobile" sui KPI
  fiscali (`DashboardFiscalKpis`/`MobileFiscalKpis`/`DashboardNetAvailabilityCard`)
  — UI-7.
- **C5 esteso**: il component test copre anche `DashboardNetAvailabilityCard` e
  `MobileFiscalKpis`, non solo `DashboardFiscalKpis`.

## 14. REVISIONE DEFINITIVA (2026-06-19) — formula reale validata su 2 dichiarazioni AdE

> Questa sezione SUPERA l'approccio "calibrazione su aliquota effettiva" delle
> sezioni precedenti. Origine: l'utente ha fornito le dichiarazioni Redditi PF
> reali (Cassetto Fiscale AdE, SPID) per periodo d'imposta **2023** e **2024**.
> La calibrazione su aliquota effettiva NON serve: la formula forfettaria
> standard riproduce il commercialista al centesimo, una volta corretti DATI e
> METODO. Cambia la natura del lavoro: da "stima migliore" a "replica esatta".

### 14.1 Verità validata (oracoli di test)

Dichiarazione PF 2024 (periodo 2023), id `10141631371`:
- LM022/003 componenti positivi = **10.993**; coeff 78%; LM034 reddito lordo = **8.575**
- LM035 contributi dedotti = **0**; LM036/038 reddito netto = **8.575**
- LM039 imposta sostitutiva 5% = **429**
- RR5 reddito imponibile = 8.575; aliquota codice **C**; RR contributo dovuto = **2.249**
  (`8.575 × 26,23% = 2.249`, aliquota GS 2023)

Dichiarazione PF 2025 (periodo 2024), id `11320252020`:
- LM022/003 componenti positivi = **9.240**; coeff 78%; LM034 reddito lordo = **7.207**
- LM035 contributi dedotti (versati cassa) = **2.538**; LM036/038 reddito netto = **4.669**
- LM039 imposta sostitutiva 5% = **233**; LM045 acconti = 429 → LM047 credito = **196**
- RR5 reddito imponibile = 7.207; aliquota **C**; RR contributo dovuto = **1.879**
  (`7.207 × 26,07% = 1.879`, aliquota GS 2024)

### 14.2 Formula canonica reale (il tool DEVE riprodurla)

```
reddito_lordo(Y)       = componenti_positivi(Y) × coefficiente            (78%)
inps_competenza(Y)     = reddito_lordo(Y) × aliquota_gs(Y)                (26,23% 2023; 26,07% 2024; per-anno)
imposta_base(Y)        = reddito_lordo(Y) − contributi_versati_cassa(Y)   (LM035: INPS PAGATO nell'anno, cassa)
imposta_sostitutiva(Y) = imposta_base(Y) × aliquota_sost(Y)              (5% startup)
```

Nessun minimale (Gestione Separata pura, confermato RR vuoto su minimale). L'INPS
insiste sul reddito lordo; l'imposta deduce i contributi VERSATI per cassa
nell'anno (non quelli di competenza) — questo è il vero #3, ora chiarito dai dati.

### 14.3 I bug reali del gestionale — CORRETTO post re-review (2026-06-19)

> RETTIFICA: la prima stesura diceva "bug #2: total_inps 3.667 errato, correggi a
> 1.879". E' FALSO ed era una modifica DISTRUTTIVA. La review DB (verifica prod +
> nota DB riconciliata 2026-04-14 contro F24 AdE) ha bloccato: `total_inps` 2024 =
> 3.667,40 e' il TOTALE CORRETTO (1.788,40 acconti + 1.879 saldo). 1.879 e' solo il
> SALDO di competenza (RR "contributo dovuto"), un numero DIVERSO. NON fare UPDATE:
> cancellerebbe gli acconti reali e romperebbe la riconciliazione F24/quietanze.

**Tre numeri INPS distinti (NON confonderli):**
- **INPS competenza(Y)** = reddito_lordo(Y) × aliquota_gs(Y). 2024 = 1.879 (RR
  contributo dovuto). E' quanto "matura" sull'anno. **Questo e' l'output INPS della
  stima** (l'oracolo).
- **Contributi VERSATI cassa(Y)** = INPS effettivamente PAGATO nell'anno (LM035 =
  2.538 nel 2024; = saldo anno prec. + acconti anno corr.). **Questo deduce
  l'imposta** (imposta_base = reddito_lordo − contributi_versati). Oggi NON esiste
  come campo: fonte = F24/quietanze (`fiscal_f24_payment_lines` INPS dell'anno).
- **total_inps in `fiscal_declarations`** = 3.667,40 (ciclo cassa riconciliato).
  Dato reale del commercialista, NON si tocca.

**Bug reale unico residuo — attribuzione ricavi data-fattura vs data-incasso.**
Fabio dichiara per **data fattura** (competenza); il gestionale aggrega `payments`
per **data incasso** (cassa). Prova: Gustare FPR 10/23 emessa 29/12/2023, incassata
30/01/2024 (4.500). Fabio nel 2023 (10.993), gestionale nel 2024 (13.740);
`13.740 − 4.500 = 9.240` = dichiarato 2024. Per **predire Fabio** il tool dovrebbe
attribuire per data documento.
- LIMITE PROD (review DB): **0 payment su 31 hanno `financial_document_id`** →
  il fallback `issue_date→payment_date` (14.5) oggi ricade SEMPRE su data-incasso,
  **effetto zero** sui numeri 2025, e il 4.500 Gustare resta misattribuito.
  L'attribuzione data-fattura diventa effettiva solo col linkaggio BR2.
- Quindi v1 NON cambia i numeri finche' BR2 non avanza: dichiararlo. v1 = formula
  giusta + aliquota per-anno + controllore che SEGNALA le fatture cross-year non
  linkate (no-guess), trattate simmetricamente su entrambi i confini d'anno.
- (Nota: la norma forfettario e' cassa; Fabio usa competenza-fattura — legittimo
  con fattura immediata. L'attribuzione data-fattura va isolata SOLO nello stimatore
  predittivo, lasciando intatto INV-1 cassa altrove; etichettare UI "metodo
  commercialista".)

### 14.4 Conseguenze sul piano

- `aliquotaINPS` diventa **per-anno** (storicizzata): 2023=26,23%, 2024=26,07%,
  2025/2026 dalla circolare INPS dell'anno. Config + Settings.
- La stima dell'anno in corso usa la formula reale sul fatturato proiettato (per
  data fattura); diventa **definitiva** appena la dichiarazione reale entra.
- I 2 oracoli (2023, 2024) sono controllori RED→GREEN obbligatori: il builder
  riproduce **imposta E INPS competenza** al centesimo (2023: 429 + 2.249; 2024:
  233 + 1.879), 4 assert numerici per anno (fixture inline, WF-20). RED genuino:
  oggi il codice usa aliquota fissa 26,07% e deduce INPS di competenza, quindi
  sbaglia su entrambi gli anni e su entrambi i componenti.
- Firma builder PURA (review TDD F1): `buildFiscalYearEstimate` accetta input
  espliciti inline — `reddito_lordo` (o componenti+coeff), `aliquota_gs_anno`,
  `contributi_versati_cassa`, `aliquota_sost` — niente fetch dentro. Definire la
  firma PRIMA del primo test. Stessa firma client + EF (parity).
- `total_inps` in `fiscal_declarations` NON si tocca (vedi 14.3 rettifica): e' il
  totale ciclo riconciliato. La card "reale" 2024 va alimentata dal numero giusto
  per il concetto giusto (competenza 1.879 per "INPS dell'anno"; il dovuto-da-pagare
  resta sugli `fiscal_obligations`), senza UPDATE distruttivi.

### 14.5 Nodo dati per l'attribuzione data-fattura (verificato su sorgente)

Campi data disponibili:
- `payments.payment_date` = data incasso (cassa) — usato oggi da `buildFiscalYearEstimate`.
- `services.service_date` = data lavoro.
- `financial_documents.issue_date` = **data fattura** (la base di Fabio); migration
  `20260302010500_financial_documents_foundation.sql`, `issue_date DATE NOT NULL`.

Vincolo di fattibilità: `financial_documents` e' **incompleto** (assessment BR2: 6
fatture referenziate non importate; link `payments.financial_document_id` sparso).
Quindi un'attribuzione data-fattura ESATTA su tutti i ricavi dipende dalla
completezza/linkaggio di `financial_documents` → si interseca con BR2.

Strategia v1 proposta (da validare in piano + review):
- ricavo attribuito per `issue_date` del documento collegato quando il
  `payment` ha `financial_document_id`; altrimenti fallback su `payment_date`.
- i soli casi divergenti sono le fatture a cavallo d'anno (emesse a dicembre,
  incassate a gennaio): identificarle e, se prive di documento collegato,
  segnalarle (non indovinare l'anno). Il 4.500 Gustare FPR 10/23 e' il caso noto.
- la completezza piena (import 6 fatture + FK) resta lavoro BR2: la stima
  fiscale migliora man mano che i documenti vengono collegati, senza bloccare v1.
