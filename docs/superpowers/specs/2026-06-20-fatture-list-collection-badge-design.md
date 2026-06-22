# Spec v2 — Badge stato incasso nella LISTA Fatture (desktop + mobile) — Task 7b

Stato: `draft v2` — revisionata da review multi-superficie (4 revisori + sintesi, RAG :8001 +
sorgente, 2026-06-20). Gate v1 era **BLOCK**; v2 chiude i 3 BLOCK + i FLAG. In attesa
re-review e gate spec→codice utente.
Data: 2026-06-20
Relazione: realizza il follow-up "Task 7b badge incasso in LIST desktop + card mobile" (BR1 /
`development-continuity-map`). NON resuscita la colonna morta `settlement_status` (vedi §2):
deriva dai `payments` FK come già fa lo Show.

> **Changelog v1→v2 (review-driven):** BLOCK-1 fetch `@in` malformato → pattern full-view Map
> (`useClientBalances`-style); BLOCK-2 §2 corretto (`SupplierFinancialSection` consuma i campi
> morti — bug reale fuori scope); BLOCK-3 superficie export CSV aggiunta con decisione esplicita;
> FLAG cella neutra "—", prop threading row+card, stati prod-reachable, prefs colonne salvate,
> collisione label anti-leak E2E, semantica status-only, controllori falsificabili concreti.

---

## 1. Problema

La vista **Fatture** (`financial_documents_summary`) elenca i documenti ma la LISTA
(desktop `FinancialDocumentListContent` + card mobile, stesso file) **non mostra lo stato
incasso**. Colonne attuali: Numero, Data, Controparte, Tipo, Direzione, Imponibile, Bollo,
Totale. Per sapere se una fattura è incassata, l'utente deve **aprire ogni fattura** (lo Show
ha il badge, la lista no). Frizione quotidiana: "quali fatture ho ancora da incassare?" non ha
risposta a colpo d'occhio.

Lo Show già risolve via `deriveDocumentCollectionState(payments)`
([financialDocumentHelpers.ts:144-161](../../../src/components/atomic-crm/invoices/financialDocumentHelpers.ts)),
derivando dai `payments` collegati al documento (`financial_document_id`). Manca solo la
proiezione in lista.

---

## 2. Chiarimento: NON è il bug "settlement_status" della vista (ma un consumer ESISTE)

`financial_documents_summary.settlement_status` / `settled_amount` / `open_amount` derivano da
`financial_document_cash_allocations`, che su prod è **vuota** (0 righe) → quei campi sono
inaffidabili (ogni doc risulta `overdue`/`settled=0`).

Nella vista **Fatture** (lista + Show) e nell'**AI** questi campi NON sono usati (verificato
sorgente):

- `financialDocumentHelpers.ts:128-138` — stato derivato dai payments, "NOT from the dead
  `settlement_status`".
- `FinancialDocumentShow.tsx` — badge da `deriveDocumentCollectionState(payments)`.
- lista/mobile — nessun riferimento a settlement.
- AI snapshot — esclude `settled_amount/open_amount/settlement_status` (anti-leak, test dedicato).
- E2E `invoices.smoke.spec.ts:113-119` (anti-leak sullo Show; **rif. v1 errato "77-83"**).

**CORREZIONE v2 (review BLOCK-2):** esiste UN consumer reale dei campi morti, FUORI dalla vista
Fatture: `SupplierFinancialSection.tsx` (dettaglio fornitore):

- `:67-68` `totalPaid += doc.settled_amount; totalOpen += doc.open_amount;`
- `:69` `if (doc.settlement_status === "overdue") overdueCount++;`
- `:174-176` badge per-doc `statusVariant/statusLabels[doc.settlement_status]`.

Conseguenza reale: la sezione "Situazione debiti / crediti" del fornitore mostra **Pagato €0**
e **Da pagare = totale pieno** per OGNI fornitore (settled_amount sempre 0), più un count
"scaduti" gonfiato e badge sempre `overdue`. **È un bug user-facing reale**, NON risolto da
questa spec. Va trattato in spec separata (vedi §12). Questa spec resta scoped alla lista
Fatture e NON tocca la vista né `SupplierFinancialSection`.

---

## 3. Obiettivi

1. Mostrare nella LISTA Fatture (desktop) una colonna **"Incasso"** con badge derivato dai
   `payments` FK col medesimo helper `deriveDocumentCollectionState` (single source).
2. Stesso badge nella **card mobile** (UI-7), threadato in ENTRAMBE le rese (vedi §6.2).
3. Recupero payments **full-view + Map** (pattern `useClientBalances`, NON `@in`): un solo
   `useGetList('payments', { perPage alto, filter financial_document_id non-null })` →
   `Map<String(financial_document_id), Payment[]>`.
4. Colonna nascondibile/ridimensionabile (entry in `INVOICE_COLUMNS` + `useColumnVisibility` +
   `ResizableHead`, UI-1), con strategia esplicita per le **prefs colonne già salvate** (§6.4).

### 3.1 Semantica (status-only, amount-agnostic) — review FLAG-9

`deriveDocumentCollectionState` ramifica SOLO su `payment.status`, mai su importo o
`document_type` (`financialDocumentHelpers.ts:144-161`). Decisioni esplicite:

- ordine di precedenza: tutti `ricevuto` → **Incassata**; almeno un `ricevuto` (non tutti) →
  **Parziale**; almeno un `scaduto` → **Scaduta**; altrimenti → **Da incassare**; nessun
  payment collegato → **"—"** (neutro).
- AQUACHETA overpaid (payment 465 > total 372) → **Incassata** (by design, amount-agnostic).
- nota di credito CON un payment `ricevuto` (raro) → **Incassata** (status-only); senza payment
  (caso normale) → **"—"**.
- caso misto `in_attesa` + `scaduto` (no ricevuto) → **Scaduta** (precedenza scaduto).

### 3.2 Stati raggiungibili in PROD oggi — review FLAG-6

BR2 ha collegato SOLO i 25 payment `ricevuto` outbound customer-invoice; ha lasciato l'unico
`scaduto` (FPA 1/23) **FK-NULL** apposta e non ha collegato gli inbound. Quindi oggi in prod gli
stati realmente raggiungibili sono **Incassata** (i 25) e **"—"** (tutto il resto: storici
no-doc, note credito, inbound). `Scaduta`/`Parziale`/`Da incassare` compaiono solo quando un doc
avrà un payment collegato non-`ricevuto` (nessuno oggi). L'helper li copre comunque (test
sintetici); lo smoke prod asserisce solo "almeno un Incassata reale", NON un "Scaduta reale".

---

## 4. Non-obiettivi

- **NON** toccare la vista `financial_documents_summary`, `settlement_status`,
  `financial_document_cash_allocations`.
- **NON** correggere il bug `SupplierFinancialSection` (§2/§12: spec separata).
- **NON** aggiungere campi all'AI snapshot (anti-leak intatto: nessun nuovo campo vista).
- **NON** creare migration/Edge Function (smallest correct layer = frontend/provider).
- **NON** abilitare SORT/FILTER server-side per stato incasso: frontend-only lo preclude
  (`SortButton` ha solo issue_date/total_amount/document_number). Tradeoff ACCETTATO e
  dichiarato (review FLAG-3); un eventuale `collection_state` in vista sarebbe l'unica via al
  sort server-side → follow-up se servirà.
- **NON** modificare lo Show (già corretto) né i totali/riepilogo direction-aware.
- **NON** cambiare la semantica di `deriveDocumentCollectionState` (riuso puro).

---

## 5. Fonti di verità

- `financialDocumentHelpers.ts` — `deriveDocumentCollectionState` (riuso).
- `FinancialDocumentShow.tsx:39-52` — `COLLECTION_TONE_CLASS` (3 chiavi: pending/settled/overdue;
  **niente `neutral`**, ritorna `null` per neutral) + `CollectionBadge`. Mappa da estrarre
  condivisa AGGIUNGENDO il caso neutro (§6.3).
- `ClientListContent.tsx:51-62` + `ClientList.tsx:31` — **pattern canonico** "colonna derivata
  da risorsa sorella": `useGetList(perPage 1000)` + Map, full-view, NO `@in`. Da replicare.
- `FinancialDocumentListContent.tsx` — lista desktop (`FinancialDocumentRow`) + card mobile
  (`FinancialDocumentMobileCard`), 2 componenti separati con props `{doc, link}`.
- `FinancialDocumentList.tsx:31-52` — **exporter CSV** (riceve TUTTI i record, non la pagina) +
  `filterExportRow`. Superficie dello sweep (§10).
- `misc/columnDefinitions.ts:18-27` (`INVOICE_COLUMNS`, ogni colonna ha `exportKey`),
  `:82-95` (`filterExportRow` filtra per `exportKey`).
- `hooks/useColumnVisibility.ts` — `visibleKeys = savedColumns ?? allKeys` (**override, non
  merge**): nuova colonna non appare per utenti con prefs salvate (§6.4).
- `payments` schema: `financial_document_id` FK, `status`. RLS: policy "Authenticated full
  access" (`20260225180000_gestionale_schema.sql:182-183`) → leggibile (single-user sempre auth).
- `voidInvoiceSurfaces.ts` — `invalidateQueries({queryKey:['payments']})` su void (copre il
  nuovo fetch se usa `useGetList('payments',...)`, key `['payments','getList',...]`).

---

## 6. Decisioni & invarianti

### 6.1 Fetch: full-view Map (NON `@in`) — review BLOCK-1

Nuovo hook `usePaymentsByDocument(): Map<string, Payment[]>` modellato su `useClientBalances`:

```
useGetList('payments', {
  pagination: { page: 1, perPage: 500 },
  filter: { 'financial_document_id@not.is': null },
})
// → group by String(financial_document_id) into Map<string, Payment[]>
```

Motivazione: il filtro `@in` con array grezzo è **malformato** per ra-data-postgrest
(`parseFilters` produce `in.id1,id2` senza parentesi; l'unico precedente `@in` funzionante,
`document_type@in`, passa una STRINGA `"(a,b)"`). Il full-view Map elimina il bug, la
sizing-risk del perPage, il churn di queryKey per pagina/sort, e allinea al pattern sorella.
Dataset banale (32 payment, 25 linkati). Query key `['payments','getList',...]` → coperta dalla
invalidation resource-level esistente (WF-18).

### 6.2 Prop threading desktop + mobile (UI-7) — review FLAG-5

`FinancialDocumentRow` e `FinancialDocumentMobileCard` oggi ricevono solo `{doc, link}`. Il
fetch+Map vive nel parent `FinancialDocumentListContent`; ENTRAMBI i componenti ricevono un
nuovo prop `collectionState: DocumentCollectionState` (= `deriveDocumentCollectionState(
map.get(String(doc.id)))`). Vietato wirare solo il desktop (trappola UI-7). Controllore:
parity test non-tautologico (§8).

### 6.3 Cella neutra "—" — review FLAG-4

Lo Show ritorna `null` per `neutral`; una cella di lista NON può essere vuota. La maggioranza
dei doc oggi è neutra ("—"). Resa: per `tone==='neutral'` rendere **testo muted "—"**
(`<span className="text-muted-foreground">—</span>`, come `TaxableValue`/`StampValue` a
`:59,65`), NON un Badge. Estrarre la mappa tone→classe condivisa (Show + lista) aggiungendo il
ramo neutro esplicito. Controllore: doc senza payment → cella "—" visibile, non badge vuoto/nero.

### 6.4 Visibilità colonna con prefs salvate — review FLAG-7

`useColumnVisibility` fa override totale (`savedColumns ?? allKeys`): l'utente prod ha 8 chiavi
salvate SENZA `collection` → la colonna "default visibile" NON apparirebbe. Decisione:
**merge delle nuove chiavi default-visibili** in `useColumnVisibility` (le chiavi note in
`allKeys` ma assenti da `savedColumns` restano visibili), con test falsificabile (`savedColumns`
senza `collection` → `isVisible('collection') === true`). Alternativa documentata se il merge è
troppo invasivo: l'utente riattiva dal toggle colonne (come #19 R5) — ma il merge è preferito
(zero azione utente). **Da decidere nel piano** (vedi §11).

### 6.5 Export CSV — review BLOCK-3

L'exporter (`FinancialDocumentList.tsx`) riceve TUTTI i record (non la pagina) e costruisce le
righe via `filterExportRow` su `exportKey`. Il badge è **derivato live dai payments**, non un
campo del record, e un page-fetch non coprirebbe l'export. Decisione: la colonna `collection`
**NON ha `exportKey`** → `filterExportRow` la ignora, export CSV invariato. Controllore:
micro-test su `filterExportRow` (dato `visibleKeys` con `collection`, l'output NON contiene una
colonna incasso). Se in futuro si vorrà esportarla, servirà un fetch payments full-record
dedicato nell'exporter (out of scope).

### 6.6 Altri invarianti

- tone→colore: riuso ESATTO della mappa Show (estratta), nessuna nuova palette.
- responsive: la colonna `collection` resta **sempre visibile su desktop** (nessun
  `hidden lg:`), perché lo stato incasso è target di scansione primario (mobile = card).
- posizione colonna: prima di "Totale".

---

## 7. Rischi

| Rischio | Mitigazione |
|---|---|
| `@in` malformato (era BLOCK) | sostituito da full-view Map (§6.1) |
| Mobile dimentica il badge (UI-7) | prop in ENTRAMBI + parity test mutation-based (§6.2/§8) |
| Cella neutra badge vuoto | "—" muted text esplicito + test (§6.3) |
| Colonna nascosta da prefs salvate | merge default-visible + test (§6.4) |
| Export CSV colonna fantasma | no exportKey + micro-test filterExportRow (§6.5) |
| Freshness post-void/settle | `useGetList('payments')` key coperta da invalidation `['payments']`; test su MobileAdmin (staleTime 2min), non DesktopAdmin (staleTime 0 = falso negativo) — WF-18 |
| Collisione label anti-leak E2E | gli assert `invoices.smoke` sono show-scoped (`page.locator('main')` post-navigazione, lista smontata); verificare resti verde + assert positivo lista (§8) |
| No sort/filter server-side per incasso | tradeoff accettato e dichiarato (§4) |

---

## 8. Criteri di accettazione (TDD, falsificabili) — review FLAG (TDD)

- **Unit (esistenti, verdi)**: `deriveDocumentCollectionState` (5 stati).
- **Unit nuovo (puro)**: builder `Map<string, Payment[]>` da lista flat di payments →
  raggruppamento per `String(financial_document_id)`; doc senza payment → assente → helper "—".
  Coprire: N payment su M doc; AQUACHETA overpaid → Incassata; nota credito con `ricevuto` →
  Incassata; misto `in_attesa`+`scaduto` → Scaduta.
- **Component test** (modello `MobileDashboard.parity.test.tsx`): render con
  `QueryClientProvider` + mock `useListContext` (doc fixture) + mock `useGetList('payments')`
  (ritorna i payment per-doc) + mock `useColumnVisibility` (cv passthrough che NON nasconde
  `collection`). Falsificabile: rimuovere il passaggio del badge nella Row →
  `getByText("Incassata")` fallisce. Casi: doc incassato → "Incassata"; doc senza payment → "—"
  visibile (non badge vuoto).
- **Parità UI-7 (non tautologica)**: montare lo STESSO doc con `useIsMobile` true e false →
  stesso label; mutation-assert: rimuovere il badge dalla card mobile → caso mobile rosso,
  desktop verde.
- **Prefs colonne**: test che `savedColumns` SENZA `collection` → `isVisible('collection')===true`
  (post-merge §6.4). Falsificabile: togliere il merge → rosso.
- **Export non-regressione**: `filterExportRow` con `visibleKeys` incluso `collection` →
  l'output NON contiene colonna incasso (`collection` senza `exportKey`).
- **E2E smoke (NON opzionale, WF-19 + WF-17)**: dati demo deterministici + cleanup in `finally` +
  0 leftover; lista Fatture mostra colonna "Incasso" + ≥1 "Incassata" reale; desktop + mobile;
  0 errori console. Verificare che `invoices.smoke` anti-leak resti VERDE e show-scoped.
- **Verifica repo**: typecheck/lint/build 0; continuity:check OK; smoke fiscale
  `ef-reminder-parity` invariato (questa spec non tocca fiscale/cassa — verificato: il badge non
  alimenta totali/riepilogo/cassa).

---

## 9. Controllore nuovo o esistente?

- Riuso test esistenti `deriveDocumentCollectionState`.
- Nuovo: builder Map puro + test; component test lista (desktop+mobile parity); test
  `useColumnVisibility` merge; micro-test `filterExportRow`; e2e smoke list collection.
- Nessuna migration, nessun gate SQL (frontend-only).

---

## 10. Superfici toccate (Mandatory Surface Sweep) — aggiornato review BLOCK-3

1. `FinancialDocumentListContent.tsx` — fetch+Map nel parent; colonna desktop (Row) + badge card
   mobile (MobileCard); nuovo prop `collectionState` in ENTRAMBI.
2. nuovo hook `usePaymentsByDocument.ts` (o inline nel ListContent) — full-view Map.
3. `misc/columnDefinitions.ts` — `INVOICE_COLUMNS` nuova chiave `collection` (SENZA `exportKey`).
4. `financialDocumentHelpers.ts` — estrazione mappa tone→classe condivisa + ramo neutro.
5. `FinancialDocumentShow.tsx` — usa la mappa estratta (no cambi funzionali).
6. `hooks/useColumnVisibility.ts` — merge nuove chiavi default-visibili (§6.4, se scelto).
7. `FinancialDocumentList.tsx` (exporter) — VERIFICA: `collection` senza exportKey non entra
   nell'export (micro-test); nessuna modifica funzionale.
8. test: nuovi come §8/§9.
9. NESSUN: migration, view, Edge Function, AI registry/snapshot, Settings, `SupplierFinancialSection`.

---

## 11. Domande aperte / decisioni utente

- [ ] Visibilità prefs salvate (§6.4): merge in `useColumnVisibility` (raccomandato) vs
  documentare re-enable manuale?
- [ ] Filtro "mostra solo da incassare": in questa spec o follow-up? (raccomandato follow-up;
  oggi anche il sort server-side è precluso, §4).
- [ ] Confermi l'approccio full-view Map (§6.1) — coerente con `ClientListContent`.

---

## 12. Finding collegato (review-emerso, FUORI scope — decisione priorità utente)

**Issue LATENTE `SupplierFinancialSection` (0 esposizione prod — misurato 2026-06-21)**: la
sezione "Situazione debiti / crediti" deriva `Pagato`/`Da pagare`/scaduti da `settled_amount`/
`open_amount`/`settlement_status` (campi morti, allocations vuota). IN CODICE mostrerebbe
**Pagato €0 / Da pagare pieno** per ogni fornitore. **MA misura prod**:

- `financial_documents`: solo **outbound** (27 customer_invoice + 1 customer_credit_note); **0
  doc inbound/supplier**.
- summary view filtrata `supplier_id` → **0 righe**; `cash_movements` → **0 righe**; `payments`
  non ha `supplier_id` né direzione (traccia solo incassi clienti).

Quindi `SupplierFinancialSection` cade SEMPRE nello stato vuoto ("Nessun documento fiscale
collegato"); il ramo wrong-data non si esegue mai → **0 esposizione user-facing**. È un'issue di
correttezza **latente**: da guardare solo SE/quando si importeranno fatture fornitore (inbound).
NON vale una spec ora (cugino di Scope C, gated su esposizione 0). Se in futuro entrano doc
inbound: derivare lo stato dai `payments` FK o ridisegnare la sezione. Documentato, non
schedulato.
