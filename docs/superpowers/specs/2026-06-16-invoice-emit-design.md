# Emetti Fattura (Invoice Emit) — Design Spec

Data: 2026-06-16
Stato: draft, in review utente
Origine: frizione UX sollevata dall'utente ("come dico al sistema quando emetto
una fattura?"). Oggi serve un giro a 3 passi: bozza -> Aruba -> ri-import XML.
Input: mappa superfici multi-superficie + RAG (DeepWiki rigenerato su `main`
b1c9d223) verificata sul sorgente reale.

## Problema

Oggi non esiste un'azione "emetti fattura". Il modulo `invoicing/` costruisce
solo una BOZZA (PDF/XML FatturaPA) e **non scrive nulla nel DB**. La fattura
entra nel sistema solo se l'utente **ri-importa** l'XML con l'AI
(`invoice_import_confirm`), che crea un `payment` ma **non** una riga
`financial_documents`. Risultato: tre passaggi manuali, e la "fattura emessa"
non e' un oggetto di prima classe nel gestionale.

Verita' verificate sul sorgente:

- `invoicing/` scrive zero (solo download Blob client-side).
- `financial_documents` e' popolata SOLO dall'import storico; nessun flusso
  utente la scrive (0 `insertInto('financial_documents')` in tutto il repo).
- `invoice_import_confirm` crea `payments`/`expenses`/`services`/`suppliers`,
  MAI `financial_documents`.
- `invoices` e' una resource read-only (list+show; test guard
  `moduleRegistry.test.ts:67-84`).
- La cassa fiscale legge SOLO `payments` con `status='ricevuto'`
  (`fiscalModel.ts:216-219`, `analytics_yearly_cash_inflow`).

## Obiettivo

Dalla bozza gia' costruita, un'unica azione "Emetti fattura" che, in modo
atomico e sicuro:

1. registra la fattura emessa in `financial_documents`
   (`direction='outbound'`, `document_type='customer_invoice'`);
2. crea l'incasso ATTESO in `payments` (`status='in_attesa'`), fiscalmente
   neutro (NON ricavo di cassa);
3. marca i `services`/`expenses` inclusi come gia' fatturati (`invoice_ref`),
   per non riproporli;
4. permette il download dell'XML FatturaPA (riuso del builder esistente), con
   invio ad Aruba che resta manuale.

## Non-Obiettivi

- NON trasmettere a SdI/Aruba dal sistema (IdTrasmittente = CF Aruba PEC; il
  sistema non e' trasmittente).
- NON rendere `invoices` scrivibile (resta read-only; il test guard resta).
- NON ricablare `financial_documents_summary.settlement_status` (dipende da
  `cash_allocations`, codice morto post 2026-04-01) — follow-up.
- NON aggiungere un UNIQUE su `payments(client_id, invoice_ref)` (gli acconti
  FPR 1/25 hanno gia' 2 payment con stesso ref; richiede expand/contract con
  backfill) — follow-up.
- NON gestire ora quote e singolo service come sorgenti (partiamo da project e
  client, che hanno il meccanismo `invoice_ref` marcabile).
- NON aggiungere una colonna stato esplicita (`emitted_at`/`status`): la
  presenza della riga `financial_documents` outbound + `invoice_ref` sui
  sorgenti E' gia' lo stato "emessa".
- NON introdurre IVA o deduzioni (regime forfettario).

## Fonti Di Verita'

- Bozza/righe: `invoicing/buildInvoiceDraftFrom{Project,Client}.ts`,
  `invoiceDraftTypes.ts` (`computeInvoiceDraftTotals`,
  `hasInvoiceDraftCollectableAmount`).
- Totali XML: `invoiceDraftXml.ts` (`buildInvoiceDraftXml`,
  `sanitizeLatinForFatturaPA`).
- Schema fattura: migration `20260302010500_financial_documents_foundation.sql`
  (UNIQUE `financial_documents_identity_unique(client_id, direction,
  document_number, issue_date)`).
- Schema payment: `20260225180000_gestionale_schema.sql:89-108` (status CHECK
  `ricevuto|in_attesa|scaduto`; payment_type CHECK
  `acconto|saldo|parziale|rimborso_spese`).
- Cassa fiscale: `fiscalModel.ts`, `analytics_yearly_cash_inflow`.
- Blueprint scrittura transazionale: `invoice_import_confirm/index.ts:248-471`
  (role authenticated + jwt claim + `db.transaction`), dedup
  `checkDuplicatePayment:56-187`.
- Blueprint provider->EF: `dataProviderInvoiceImport.ts:104-127`.

## Decisione Di Design

Architettura **smallest correct layer = Edge Function transazionale**
(`invoice_emit`), perche' l'operazione e' multi-step atomica (1
`financial_documents` + 1 `payment` + N `UPDATE invoice_ref`) e il dataProvider
non garantisce atomicita' cross-table. Esposta via metodo provider
`emitInvoice` (Provider-First). Agganciata come terza azione nel
`InvoiceDraftDialog` (un solo punto, 4 schermate la ereditano).

### Flusso (un'unica transazione server-side)

1. `INSERT financial_documents` (outbound/customer_invoice; totali da
   `computeInvoiceDraftTotals`; `taxable_amount`, `stamp_amount`, `total_amount`,
   `issue_date`, `document_number`, `due_date`).
2. `INSERT payments` (`status='in_attesa'`, `amount = taxableAmount` (bollo
   escluso), `payment_type='saldo'`, `payment_date = due_date`,
   `invoice_ref = document_number`, **`financial_document_id`** = id del passo 1).
3. `UPDATE invoice_ref = document_number` su tutti i `services`/`expenses`
   inclusi nel draft (consumando le `lineItems` gia' filtrate dal builder; mai
   rileggere le `expenses` km auto-generate da trigger — DB-8).
4. (opz.) allocazione su progetto se applicabile.

Tutto-o-niente: un fallimento parziale fa rollback completo.

### Legame con il re-import (anti doppio conteggio)

- Chiave stabile condivisa = **numero fattura** (`document_number` <->
  `payments.invoice_ref`).
- **Nuova colonna additiva `payments.financial_document_id`** (FK nullable):
  chiave di dedup deterministica e base per "pagata? quanto resta?" (BR2).
- `invoice_import_confirm` viene esteso: se l'XML importato corrisponde a una
  fattura gia' emessa dal sistema (match per `document_number`/`invoice_ref` +
  `client_id`), invece di creare un nuovo payment fa **update-in-place** del
  payment esistente `in_attesa -> ricevuto` + `payment_date` (match che IGNORA
  lo status). Niente nuovo record.

### Numerazione

Manuale con **progressivo suggerito** (max `document_number` outbound dell'anno
+ 1), sempre editabile. Unicita' garantita da
`financial_documents_identity_unique`. Il protocollo definitivo lo assegna
Aruba/SdI; un auto-progressivo rigido divergerebbe.

### UI / UX / Mobile

- Terzo bottone nel `InvoiceDraftDialog` ("Emetti e scarica XML"), abilitato
  solo se `hasInvoiceDraftCollectableAmount` E dati emittente/cliente completi
  per l'XML (gate deterministico con messaggio specifico — DOM-3).
- Branching `isMobile -> Sheet` (pattern `DichiarazioneEntryDialog.tsx:329`):
  CTA in footer sticky, feedback persistente; verificare i 4 consumer.
- Feedback conferma stile `AiInvoiceImportView` ("Fattura registrata · 1
  incasso atteso" / "gia' emessa, saltata").
- Bottone disabilitato durante il submit + dedup-guard pre-save (pattern WF-14:
  query `client_id+document_number`, `window.confirm` se match) contro doppio
  click / doppia emissione.

## Invarianti

- L'emit NON altera la cassa fiscale: il payment nasce `in_attesa`, quindi
  `buildFiscalYearEstimate` e `analytics_yearly_cash_inflow` dell'anno restano
  invariati finche' non si incassa davvero.
- Una fattura/incasso esiste al massimo una volta: emit + eventuale re-import
  dello stesso XML => 1 sola riga `financial_documents` e 1 solo `payment`.
- Dopo l'emit, riaprire la bozza sugli stessi sorgenti => `collectableAmount <=
  0` (niente ri-fatturazione).
- Km contati una volta sola (riga del service, mai l'expense auto da trigger).
- `payment_type` sempre dentro il CHECK (`saldo`, mai `rimborso`).
- `invoices` resta read-only; `financial_documents_summary` non si tocca.
- Tutte le stringhe XML passano da `sanitizeLatinForFatturaPA` (DOM-7).

## Rischi

| Sev | Rischio | Mitigazione |
|---|---|---|
| 🔴 | Doppio conteggio (emit + re-import) | chiave `document_number`/`financial_document_id`; re-import fa update-in-place, non insert |
| 🔴 | Perdita/incoerenza dati (atomicita') | unica transazione EF tutto-o-niente; FK gia' `NO ACTION` (anti-cascata) |
| 🔴 | Errore cassa (fattura contata come ricavo) | payment `in_attesa`, mai `ricevuto`; amount = imponibile (bollo escluso) |
| 🟠 | Doppia emissione (doppio click) | dedup-guard pre-save + idempotenza su `financial_documents_identity_unique` + bottone disabilitato |
| 🟠 | Km doppi (DB-8) | consumare le `lineItems` del draft, mai rileggere le expenses km |
| 🟠 | XML scartato da Aruba (dati mancanti) | gate UI che blocca l'emit se issuer/client billing incompleti |
| 🟠 | Parita' mobile (UI-7) | branching Sheet + stessi props sui 4 consumer + MobileDashboard |
| 🟡 | Numerazione / bollo / settlement morto | progressivo suggerito editabile; `stamp_amount` valorizzato, nessun payment per il bollo; settlement_status documentato come follow-up |

## TDD / Controllori (MONEY/FISCAL TDD — RED prima)

1. emit + re-import stesso XML => **1 solo payment** (no doppio conteggio).
2. dopo emit, `buildFiscalYearEstimate` e `analytics_yearly_cash_inflow`
   dell'anno **invariati** (cassa neutra).
3. dopo emit, `buildInvoiceDraftFrom*` sullo stesso source =>
   `collectableAmount <= 0` (anti ri-fatturazione).
4. service km + expense auto => **1 sola riga km** registrata (DB-8).
5. gate XML: emit bloccato se issuer/client billing incompleti (DOM-3).
6. payment creato con `status='in_attesa'`, `amount=taxableAmount`,
   `payment_type='saldo'`, `financial_document_id` valorizzato.

## Criteri Di Accettazione

- Un'azione "Emetti fattura" dal dialog bozza registra fattura + incasso atteso
  + marca i sorgenti, in transazione atomica.
- Re-import dello stesso XML non crea doppioni (update-in-place).
- Cassa fiscale dell'anno invariata dopo l'emit.
- XML scaricabile identico a oggi (FPR12, sanitize Latin-1).
- Parita' desktop/mobile; `invoices` ancora read-only; nessuna perdita dati.
- typecheck/lint/build verdi; EF deployata (ref `qvdmzhyzpyaveniirsmo`,
  `config.toml verify_jwt=false`); 6 controllori verdi.

## File Coinvolti (anticipazione per il piano)

- Nuovo: `supabase/functions/invoice_emit/` + entry `config.toml` (BE-2).
- Nuova migration additiva: `payments.financial_document_id` (nullable FK,
  `IF NOT EXISTS`, replayable — DB-2).
- `providers/supabase/dataProvider.ts` + nuovo `dataProviderInvoiceEmit.ts`
  (metodo `emitInvoice`).
- `invoicing/InvoiceDraftDialog.tsx` (terza azione + branching Sheet).
- `types.ts` (link `Payment.financial_document_id`, `FinancialDocument`).
- `supabase/functions/invoice_import_confirm/index.ts` (update-in-place su
  numero fattura).
- Sweep 4 show (`ProjectShow`, `ClientShow`, `QuoteShow`, `ServiceShow`) +
  MobileDashboard parity.
- Continuity docs (`architecture.md`, `development-continuity-map.md`).

## Assunzioni (da confermare in review)

1. L'invio ad Aruba resta manuale (scarico XML, carico io su Aruba). [default]
2. Il numero fattura lo metto io, con un suggerimento del prossimo progressivo.
3. Parto da fatture su progetto e cliente; quote/singolo service piu' avanti.
4. Una fattura emessa = incasso "da incassare" finche' non la pago davvero
   (coerente col forfettario per cassa).
5. Quando ri-importo l'XML, il sistema aggiorna l'incasso esistente (non ne
   crea uno nuovo).

## Review Gate

1. Review spec (questa) — utente.
2. Piano (writing-plans) + review piano multi-superficie + RAG.
3. Review implementazione multi-superficie + RAG.
4. Locale prima (RED/GREEN verdi) -> review finale -> PROD gated (OK utente):
   migration + deploy EF + smoke prod.

## Stop Point

- Niente prod senza verde locale + OK utente.
- Non rendere `invoices` scrivibile; non toccare `financial_documents_summary`.
- Non introdurre doppio conteggio: emit e re-import devono restare coerenti
  (un solo payment per fattura).
