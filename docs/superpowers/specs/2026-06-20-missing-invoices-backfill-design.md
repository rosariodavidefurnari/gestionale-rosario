# Spec — Backfill fatture mancanti (no-doc payments → financial_documents)

Stato: `partial-applied` — Bucket A LAURUS applicato su prod il 2026-06-22;
Bucket B 2026 XML arrivati in `Fatture/2026/`, ma bloccati finche' non viene
gestito l'intestatario fiscale per-documento.
Data: 2026-06-20
Autore: agente (sessione fix-minori → missing-invoices)
Relazione: segue BR2 (`2026-06-20-br2-payments-financial-documents-reconciliation-design.md`),
che ha collegato i 25 payment con doc esistente. Questa spec affronta i **6 payment
SENZA financial_document** (no-doc) emersi come follow-up di BR2.

Update 2026-06-22: applicata solo la parte con fonte completa (3 LAURUS storiche).
Verifica remota: C1 `OK_TO_APPLY` → dry-run transazionale con rollback → APPLY →
C3 `OK` (`docs_present=3`, `linked_payments=3`, `remaining_targets=0`) →
`npm run health:financial` PASS con guardrail `LAURUS no-doc backfill missing/link gaps: 0`.

Update 2026-06-22 sera: gli XML 2026 sono presenti. `FPR 1/26` e `FPR 2/26`
sono intestate a `LIVE - SOCIETA' A RESPONSABILITA' LIMITATA SEMPLIFICATA`,
mentre incassi e progetti sono sotto `ASSOCIAZIONE CULTURALE GUSTARE SICILIA`.
Quindi il backfill 2026 non deve partire con il vecchio modello "client fiscale
= client operativo". Prima serve la spec dedicata
`docs/superpowers/specs/2026-06-22-client-billing-profiles-design.md`.

---

## 1. Problema

Su prod (`qvdmzhyzpyaveniirsmo`, query read-only deterministiche 2026-06-20) esistono
**6 payment `ricevuto`** che NON hanno un `financial_documents` corrispondente: l'incasso
è registrato (cassa corretta) ma la **fattura emessa non è mai stata importata** in
`financial_documents`. Conseguenze:

- la vista **Fatture** (`financial_documents_summary`) è incompleta: 6 fatture reali
  non compaiono;
- l'attribuzione **data-fattura** (cash→competenza, cash-vs-competence card) per questi
  incassi cade in fallback cassa perché manca `issue_date` del documento;
- la riconciliazione futura col commercialista resta parziale.

La **cassa, il fiscale e le dashboard NON sono sbagliati** (i `payments` ci sono): il
guadagno del backfill è completezza del ledger Fatture + abilitazione attribuzione
data-fattura, non una correzione monetaria.

### 1.1 Stato reale misurato (no-doc)

| Cliente | invoice_ref | importo | incasso (payment_date) | tipo |
|---|---|---|---|---|
| GUSTARE SICILIA | FPR 1/26 | 2.741,20 | 2026-03-30 | saldo |
| GUSTARE SICILIA | FPR 2/26 | 2.852,03 | 2026-04-23 | **parziale** |
| LAURUS S.R.L. | FPR 1/23 | 1.872,00 | 2023-03-21 | saldo |
| LAURUS S.R.L. | FPR 1/24 | 1.750,00 | 2024-02-29 | saldo |
| LAURUS S.R.L. | FPR 3/26 | 350,00 | 2026-05-07 | saldo |
| LAURUS S.R.L. | FPR 6/23 | 2.498,08 | 2023-11-24 | saldo |

Σ incassi no-doc = **12.063,31 €** (già in cassa, distribuiti 2023/2024/2026).

### 1.2 Decomposizione per fonte (decide la fattibilità)

`Fatture/` nel repo copre **solo 2023/2024/2025** (nessun 2026 al
2026-06-22).

- **Bucket A — 3 storiche LAURUS** con XML in repo → backfill deterministico
  **APPLICATO su prod il 2026-06-22**:

  | ref | XML source | issue_date | due_date | total | imponibile | bollo | cross-year? |
  |---|---|---|---|---|---|---|---|
  | FPR 1/23 | `Fatture/2023/IT01879020517A2023_bhiYr.xml` | 2023-03-21 | 2023-03-21 | 1872,00 | 1872,00 | — | no (2023→2023) |
  | FPR 6/23 | `Fatture/2023/IT01879020517A2023_flFCj.xml` | 2023-10-24 | 2023-11-24 | 2498,08 | 2498,08 | 2,00 | no (2023→2023) |
  | FPR 1/24 | `Fatture/2024/IT01879020517A2024_aDUq8.xml` | 2024-02-02 | 2024-02-29 | 1750,00 | 1750,00 | — | no (2024→2024) |

  Per tutte: `ImportoPagamento == ImportoTotaleDocumento` (nessun +25%), `Natura N2.2`,
  `Imposta 0.00`, cliente `LAURUS S.R.L.`. Verificato sull'XML reale.

- **Bucket B — 2026**: gli XML Aruba sono ora presenti in `Fatture/2026/`,
  ma il backfill e' bloccato da un problema di modello: `FPR 1/26` e
  `FPR 2/26` sono intestate a LIVE SRLS mentre incassi/progetti sono sotto
  Gustare. Prima del backfill serve il modello backend per profili di
  fatturazione cliente definito in
  `2026-06-22-client-billing-profiles-design.md`. FPR 2/26 e
  FPR 5/26 confermano che il `total_amount` del documento viene dall'XML, NON
  dal payment.

### 1.3 Bucket C — 2 "no-payment" Aidone: NON è un problema

Le 2 fatture `FPA 1/25` + `FPA 2/25` (€200, no incasso) sono la sequenza errore→correzione
(confermata dall'utente «facemmo un errore in una fattura e dovetti rifarla»), verificata
sull'XML e su prod:

| doc | tipo | incasso | ruolo |
|---|---|---|---|
| FPA 1/25 | customer_invoice | — | fattura errata (mai pagata) |
| FPA 2/25 | **customer_credit_note** | — | nota di credito che storna FPA 1/25 |
| FPA 3/25 | customer_invoice | €200 ricevuto + FK-linkata | fattura rifatta, pagata |

Netto reale = €200 (solo FPA 3/25). Le 2 no-payment sono **corrette così** → nessun
backfill. (Vedi §6 per il finding sistemico collegato.)

---

## 2. Obiettivi

1. Creare i `financial_documents` mancanti **dalla fonte XML reale** (`Fatture/**`), con la
   STESSA shape dei documenti storici già presenti (vedi §5 invarianti di shape).
2. Collegare ogni payment no-doc al suo nuovo documento via `payments.financial_document_id`,
   **match naturale 1:1 fail-closed** (`client_id + trim(invoice_ref) = trim(document_number)`,
   `direction='outbound'`, `status='ricevuto'`, FK oggi `NULL`), idempotente.
3. **Nessun euro si muove**: `payments.amount`, `status`, `payment_date` INVARIATI; solo la FK
   viene valorizzata. Checksum cassa pre==post dentro la stessa transazione (pattern BR2 INV-1).
4. Riproducibile e reversibile: chiave naturale (no UUID hardcoded), `ON CONFLICT DO NOTHING`
   sulla UNIQUE, controllore RED→GREEN, dry-run versionato, `ON DELETE SET NULL` già esistente.
5. Strutturare il backfill perché **Bucket B** (2026) si esegua con lo stesso script quando
   gli XML Aruba sono in `Fatture/2026/`.

---

## 3. Non-obiettivi (espliciti)

- **NON** modificare `payments.amount`/`status`/`payment_date` (cassa già corretta).
- **NON** creare documenti **senza XML**: per il 2026 la fonte ora esiste, ma
  resta vietato derivare il `total_amount` dal payment, specie per documenti
  parziali o con bollo.
- **NON** toccare Aidone (Bucket C corretto) — al più, follow-up cosmetico opzionale:
  valorizzare `related_document_number` su FPA 2/25 → FPA 1/25 (clarity), fuori da questa spec.
- **NON** risolvere il finding sistemico settlement (`financial_document_cash_allocations`
  vuota → tutte le fatture "overdue") — spec separata (§6).
- **NON** correggere il +25% AQUACHETA né il bollo storico (realtà-dato, report-only, già
  triagiati in BR2).
- **NON** introdurre attribuzione ricavi data-fattura nel layer fiscale (cassa→competenza:
  money + rischio proprio → spec dedicata). Qui solo il LINK abilitante.
- **NON** introdurre nuova UI per linking manuale.

---

## 4. Fonti di verità

- prod `qvdmzhyzpyaveniirsmo` (query read-only sopra) — stato reale.
- `Fatture/2023/**`, `Fatture/2024/**` (e futuro `Fatture/2026/**`) — XML FatturaPA emessi,
  fonte dei dati documento (issue_date, total, imponibile, bollo, cliente).
- schema prod `financial_documents` (NOT NULL: `direction, document_type, document_number,
  issue_date, total_amount, currency_code`; UNIQUE `(client_id, direction, document_number,
  issue_date)`).
- shape dei doc storici già presenti (`FPR 2/23`, `FPA 1/23`, …): `direction='outbound'`,
  `document_type='customer_invoice'`, `currency_code='EUR'`, `source_path` = path XML,
  `due_date = issue_date`, `tax_amount=NULL`, `stamp_amount` dal bollo XML.
- `supabase/migrations/20260616200000_payments_financial_document_link.sql` — FK + ON DELETE.
- `scripts/br2-link-payments-financial-documents.sql` — pattern di backfill 1:1 fail-closed +
  checksum cassa (modello da riusare).

---

## 5. Invarianti & decisioni

### 5.1 Shape del documento (mirror degli storici)

Ogni nuovo `financial_documents` row:

- `direction='outbound'`, `document_type='customer_invoice'`, `currency_code='EUR'`;
- `document_number` = `<Numero>` XML (es. `FPR 1/23`); `issue_date` = `<Data>`;
- `total_amount` = `<ImportoTotaleDocumento>`; `taxable_amount` = `<ImponibileImporto>`;
- `tax_amount=NULL` (forfettario N2.2, imposta 0);
- `stamp_amount` = `<ImportoBollo>` se presente, altrimenti `NULL`;
- `due_date` = `<DataScadenzaPagamento>` se presente, altrimenti `issue_date`
  (verificato su XML reali: FPR 6/23 scade 2023-11-24, FPR 1/24 scade
  2024-02-29; non forzare la scadenza alla data fattura);
- `source_path` = path XML relativo repo (es. `Fatture/2023/IT01879020517A2023_bhiYr.xml`).
  Valorizzarlo è anche corretto rispetto al futuro void-hardening U5-B: `source_path`
  non-NULL = documento storico/importato, NON app-emesso → non void-eligibile come emesso.
- `client_id` = il cliente del payment (LAURUS), NON ricavato a mano.

### 5.2 Link payment (simmetrico a BR2)

- match SOLO esatto 1:1: `payments.client_id = fd.client_id AND trim(payments.invoice_ref) =
  trim(fd.document_number) AND fd.direction='outbound' AND payments.status='ricevuto' AND
  payments.financial_document_id IS NULL`;
- fail-closed: se 0 o >1 match per un doc → NON collegare quel doc, segnalare nel report;
- mai blind-UPDATE per stringa libera fuori dal match esatto (DB-9).

### 5.3 Idempotenza & sicurezza

- INSERT documenti con `ON CONFLICT (client_id, direction, document_number, issue_date) DO NOTHING`;
- 2ª esecuzione → 0 nuovi doc, 0 nuovi link;
- checksum cassa: `SELECT sum(amount) FROM payments WHERE status='ricevuto'` pre==post nella
  stessa transazione; `DO/RAISE` abort-on-mismatch → rollback (un UPDATE che per errore tocca
  amount/status/payment_date è corruzione silenziosa → deve far abortire).

### 5.4 Rischio DB-13 (re-import futuro)

Se in futuro l'XML viene re-importato, il flow settla in-place e **sovrascrive
`payment_date` con `issue_date`** del documento. Per le 3 storiche (Bucket A) issue_date e
payment_date sono **nello stesso anno** → nessuno shift di cassa cross-year. Per Bucket B
(2026) verificare a consegna XML che issue_date e payment_date siano stesso anno (lo sono per
costruzione: emesse e incassate nel 2026). Documentare il residuo, non introdotto da questa
spec ma da essa reso raggiungibile (come BR2/DB-13).

---

## 6. Finding sistemico collegato (OUT OF SCOPE — flag per spec separata)

La vista `financial_documents_summary` deriva `settled_amount`/`open_amount`/`settlement_status`
da `financial_document_cash_allocations`, che su prod ha **0 righe**. Quindi TUTTE le 28
fatture (incluse quelle pagate e FK-linkate, es. FPA 3/25, FPA 4/25) mostrano `settled=0`,
`open=total`, status `overdue`. Il FK `payments.financial_document_id` (popolato da BR2 e da
questo backfill) **non alimenta** questa vista.

Impatto: la colonna stato della vista Fatture è sistematicamente fuorviante (tutto "da
incassare"). NON è un bug di questa spec né di Aidone: è il gap settlement/allocazioni
(assessment Ciclo 5, "bollo/incassi"). Richiede spec dedicata: o popolare
`financial_document_cash_allocations` dai payment ricevuti FK-linkati, o cambiare la vista per
derivare il settlement dal FK `payments.financial_document_id`. **Decisione di priorità
all'utente.**

---

## 7. Rischi

| Rischio | Mitigazione |
|---|---|
| UPDATE tocca per errore colonne cassa | checksum pre==post + RAISE abort (INV) |
| collisione UNIQUE su re-run | `ON CONFLICT DO NOTHING` (idempotente) |
| client_id sbagliato | usato il client del payment, mai inventato |
| match ambiguo (>1) | fail-closed, skip + report |
| shift cassa cross-year (DB-13) | A e B stesso-anno issue↔payment (verificato/da-verificare) |
| Bucket B con destinatario divergente | non eseguibile finche' non esiste modello `client_billing_profiles` + `billing_profile_id` |
| doc creato ma non visibile come "incassato" | atteso: §6 settlement è separato; il doc compare comunque nel ledger |

---

## 8. Criteri di accettazione (RED → GREEN)

Controllore deterministico (estensione di `scripts/check-prod-financial-health.mjs` o nuovo
gate `npm run health:financial` + pure decider testabile `decidePaymentInvoiceBackfill`):

- **RED (pre-apply)**: i N payment target risultano `financial_document_id IS NULL`; i N
  document_number target NON esistono in `financial_documents`.
- **APPLY**: dry-run (RAISE forzato → rollback, `would_insert=N`, `would_link=N`) poi apply.
- **GREEN (post-apply)**:
  - N documenti presenti con shape corretta (direction/type/currency/source_path/due_date,
    stamp dove previsto);
  - N payment con `financial_document_id` valorizzato verso il doc giusto;
  - checksum cassa `sum(amount) WHERE status='ricevuto'` **0-delta** pre==post;
  - idempotenza: 2ª run → 0 insert, 0 link;
  - fiscale invariato: `npm run smoke:ef-reminder-parity` = **9.005,91 €** (0-delta);
  - `npm run health:financial` PASS (+ floor `linkedCount` aggiornato).
- **Pure decider test** (Vitest, falsificabile): match esatto → `link`; 0 match → `skip:no-doc`;
  >1 match → `skip:ambiguous`; payment non-ricevuto → `skip`; FK già valorizzata → `skip:already`.

---

## 9. Controllore nuovo o esistente?

- Riusare il pattern `scripts/br2-link-payments-financial-documents.sql` (CTE + DO-block
  checksum). Nuovo script `scripts/backfill-missing-invoices.sql` (INSERT doc da costanti
  derivate-da-XML + link).
- Nuovo pure decider `scripts/backfillInvoiceDecider.ts` + `.test.ts` (falsificabile).
- Estendere `scripts/check-prod-financial-health.mjs` con un check "no-doc residui" (floor: i
  no-doc backfillati non devono ricomparire).
- NESSUNA migration (FK e UNIQUE già esistono). NESSUNA Edge Function. Frontend immutato (la
  vista Fatture mostrerà i nuovi doc automaticamente).

---

## 10. Piano di esecuzione raccomandato

1. Review multi-superficie di questa spec (DB/Postgres, dominio fiscale forfettario,
   frontend/Fatture view + mobile parity, provider/Edge, TDD/controllori), ognuna con RAG
   :8001 (snapshot `fde4d2a7`) + verifica sorgente.
2. Implementare o approvare prima il modello `client_billing_profiles` +
   `financial_documents.billing_profile_id`, perche' due XML 2026 sono
   intestati a LIVE ma appartengono operativamente a Gustare.
3. Eseguire il backfill 2026 in un ciclo separato C1→dry-run→APPLY→C3 dopo il
   modello billing profiles.
4. Gate spec→codice: **nessuno script applicato su prod** senza via esplicito dell'utente.
5. Aggiornare docs canonici + CANTIERE + learning (eventuale nuovo trigger su
   backfill-da-XML) nello stesso commit del controllore.

---

## 11. Domande aperte / decisioni utente

- [ ] Priorità del finding sistemico settlement (§6): spec separata ora o più avanti?
- [x] Eseguire A subito o attendere B e fare A+B insieme? Decisione 2026-06-22:
  A subito applicato; B ora ha XML ma resta bloccato dal modello billing
  profiles.
- [ ] Follow-up cosmetico Aidone (`related_document_number` su FPA 2/25): farlo o ignorarlo?
