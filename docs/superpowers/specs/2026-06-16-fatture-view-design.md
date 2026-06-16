# Vista "Fatture" (financial documents) - Design Spec

Data: 2026-06-16
Stato: draft v2 (recepita review esterna), in review utente
Origine: BR1 dell'assessment `docs/superpowers/2026-06-15-gestionale-assessment.md`
(finding #5: fatture emesse invisibili nell'app + AI le ignora).

## Problema

Su produzione esistono 28 documenti fiscali reali in `financial_documents`
(27 `customer_invoice` + 1 `customer_credit_note`, dal 2023 al 2025), ma
nell'app NON c'e' nessuna pagina per vederli:

- `financial_documents` non e' registrata come resource (nessuna voce di menu,
  nessuna lista/dettaglio);
- zero riferimenti in `clients/` e `dashboard/`;
- l'unica superficie che li mostra e' `SupplierFinancialSection` (read-only, per
  i fornitori — di cui pero' ci sono 0 documenti);
- l'utente vede solo le BOZZE (`InvoiceDraftDialog`, nessuna scrittura DB);
- il contesto AID (`buildUnifiedCrmReadContext`) NON include i documenti fiscali,
  quindi l'AI "non sa" che esistono.

Risultato: per ritrovare una fattura emessa o sapere "quanto ho fatturato
quest'anno" l'utente deve andare su Aruba.

## Evidenze Raccolte (verificate su sorgente + DB live)

- Vista `financial_documents_summary` (def. live verificata): fa `LEFT JOIN` su
  clients e suppliers, espone `id, client_id, supplier_id, client_name,
  supplier_name, direction, xml_document_code, document_type,
  related_document_number, document_number, issue_date, due_date, total_amount,
  taxable_amount, tax_amount, stamp_amount, settled_amount, open_amount,
  settlement_status, project_allocations_count, project_names, currency_code,
  source_path, notes, created_at, updated_at`. Ritorna TUTTI i documenti (client,
  supplier, o nessuno dei due) -> copre lo scope "tutti i documenti".
- `settled_amount/open_amount/settlement_status` sono calcolati dalle allocazioni
  `financial_document_cash_allocations`, che sono VUOTE (0 righe). Quindi oggi
  `settled_amount=0`, `open_amount=total`, `settlement_status` = `open`/`overdue`
  per tutti -> lo "stato pagamento" e' INAFFIDABILE finche' non c'e' la
  riconciliazione (BR2). Da NON mostrare in v1.
- Provider: `dataProvider.ts:65` registra gia' la PK della vista
  (`primaryKeys.set("financial_documents_summary", ["id"])`) -> interrogabile
  come resource read-only.
- Tipi: `types.ts:208 FinancialDocument`, `:233 FinancialDocumentSummary` esistono
  gia' (da verificare/estendere shape: `supplier_name`, campi settlement).
- Registrazione resource: `moduleRegistry.ts:30 CrmModuleDefinition` ha
  `resource, label, icon?, path, components{list?,show?,edit?,create?}, nav{},
  ai?{label,description,routePatterns,supportedViews}, headless?`. `CRM.tsx`
  fa `getEnabledModules().map(m => <Resource name={m.resource} {...m.components}/>)`.
  Menu costruito da `getDesktopHeaderModules()/getMobileBottomBarModules()`.
- AI: `dataProviderAi.ts getUnifiedCrmReadContextFromResources` (Promise.all) +
  `lib/ai/unifiedCrmReadContext.ts buildUnifiedCrmReadContext`; capability
  registry da `getAiResourceModules()` (`crmCapabilityRegistry.ts`).

## Obiettivi

1. Nuova pagina "Fatture" (voce di menu) con LISTA + DETTAGLIO, sola lettura.
2. Mostra TUTTI i documenti (`financial_documents_summary`), con badge
   direzione (Emessa/Ricevuta) e tipo (Fattura/Nota di credito).
3. Filtri: direzione, tipo documento, anno (`issue_date`), cliente/fornitore;
   ricerca per numero documento; ordinamento default `issue_date` desc.
4. Riepilogo in cima alla lista: "Totale fatturato" + n. documenti del FILTRO
   attivo (stile approccio-bambino).
5. Parita' mobile (card dedicata + `MobilePageTitle`).
6. AI-aware: i documenti fiscali entrano nel contesto AI (snapshot + capability
   registry) cosi' l'AI puo' rispondere su fatture/fatturato.

## Non-Obiettivi

- Niente create/modifica/elimina: i documenti arrivano dall'import/Aruba, non si
  digitano. La vista e' READ-ONLY.
- Niente stato "pagata/da incassare" in v1: `settlement_status` e' inaffidabile
  (allocazioni vuote). Arriva con la riconciliazione (BR2). Non mostrarlo.
- Niente riconciliazione, import nuove fatture, correzione bollo (TASK 1/2/BR2).
- Non popolare ne' adottare il layer `cash_movements`/allocations.
- Non toccare `SupplierFinancialSection` (resta com'e').

## Fonti Di Verita'

- DB remoto `qvdmzhyzpyaveniirsmo` (vista live, conteggi reali).
- Sorgente: `moduleRegistry.ts`, `CRM.tsx`, `dataProvider.ts`, `dataProviderAi.ts`,
  `lib/ai/unifiedCrmReadContext.ts`, `crmCapabilityRegistry.ts`, `types.ts`,
  migration `20260302010500` / `20260308010000` / `20260331194623`.
- Assessment `docs/superpowers/2026-06-15-gestionale-assessment.md`.

## Invarianti

- Sola lettura: nessun bottone create/edit/delete; nessuna mutazione DB.
- Nessuno "stato pagamento" mostrato finche' le allocazioni sono vuote.
- Gli importi mostrati provengono dalla vista (gia' arrotondati), non ricalcolati
  a mano lato UI con rischio drift.
- Il riepilogo "Totale" somma i documenti del filtro attivo in modo
  deterministico (funzione pura testata); le note di credito vanno sottratte (o
  mostrate separate) per non gonfiare il fatturato.
- Parita' desktop/mobile: stessi dati e stesse colonne essenziali.

## Decisione Di Design

Nuova resource READ-ONLY `financial_documents_summary`, label "Fatture",
seguendo il pattern dei moduli esistenti.

- `moduleRegistry.ts`: nuovo modulo `{ resource: "financial_documents_summary",
  label: "Fatture", icon: FileText, path: "/financial_documents_summary",
  components: { list, show }, nav: { desktop header, mobile altroMenu },
  ai: { label, description, routePatterns, supportedViews:["list","show"] } }`.
  NON headless (ha UI). Solo `list` e `show` (niente create/edit).
- Componenti nuovi in `src/components/atomic-crm/invoices/` (nome cartella da
  confermare; "invoices" per chiarezza, label IT "Fatture"):
  - `FinancialDocumentList.tsx` + `FinancialDocumentListContent.tsx` (tabella
    desktop con colonne ridimensionabili) + `FinancialDocumentMobileCard.tsx`
  - `FinancialDocumentListFilter.tsx` (direzione, tipo, anno, cliente/fornitore)
  - `FinancialDocumentSummaryHeader.tsx` (Totale + count del filtro)
  - `FinancialDocumentShow.tsx`
  - `financialDocumentHelpers.ts` (badge/label/formatters puri)
  - `index.tsx` (`{ list, show, recordRepresentation }`)
- Colonne lista: Numero · Data · Cliente/Fornitore · Tipo (badge) · Direzione
  (badge) · Imponibile · Bollo · Totale. (`settled/open/status` NON mostrati.)
- Riepilogo: direction-aware (vedi "Regole di calcolo riepilogo"); calcolato sul
  dataset filtrato COMPLETO (non la pagina) tramite fetch dedicato del set
  filtrato (pattern simile a `admin/count.tsx`, ma sommando gli importi);
  funzione di somma pura testata.
- Dettaglio: tutti i campi, scomposizione Imponibile/Bollo/Totale, link cliente,
  date, note, `xml_document_code`, `related_document_number` per note credito,
  `project_names` se presente. Read-only.
- AI: in `dataProviderAi.ts` aggiungere `getList("financial_documents_summary")`
  al Promise.all; passare a `buildUnifiedCrmReadContext`; aggiungere il modulo con
  `ai` al registry -> capability registry lo espone. Tipo
  `FinancialDocumentSummary` esteso se serve.

## Regole Di Calcolo Riepilogo

- Le `customer_invoice` (emesse) AUMENTANO il "Totale fatturato".
- Le `customer_credit_note` (note di credito emesse) DIMINUISCONO il totale
  fatturato.
- I documenti RICEVUTI (`supplier_invoice`/`supplier_credit_note`, direzione
  inbound) NON entrano nel "fatturato": se il filtro li include, vanno in un box
  separato "Documenti ricevuti", mai sommati al fatturato.
- Il riepilogo si calcola su TUTTI i record che corrispondono al filtro attivo,
  NON solo sulla pagina corrente (fetch dedicato del set filtrato; con ~28
  documenti il fetch completo e' accettabile).
- Label dinamica per evitare ambiguita':
  - filtro direzione = Emesse -> "Totale fatturato" (emesse - note credito).
  - filtro direzione = Ricevute -> "Totale documenti ricevuti".
  - filtro direzione = Tutte -> due box separati (Emesse netto / Ricevute), NON
    un unico totale.
- Mostrare sempre il conteggio documenti del filtro. Opzionale: scomporre
  "Fatture emesse / Note di credito / Netto".

## Query / Filtering

- Filtro anno: tradotto in intervallo su `issue_date`
  (`issue_date@gte=YYYY-01-01` e `issue_date@lte=YYYY-12-31`), riusando il
  pattern `filters/DateRangeFilter` gia' presente. Niente estrazione anno lato
  UI fragile.
- Ricerca numero: su `document_number` (e `related_document_number` per
  collegare le note di credito).
- Filtro controparte: cerca su `client_name`/`supplier_name`; quando la
  direzione e' selezionata, mostrare il filtro coerente (Cliente per Emesse,
  Fornitore per Ricevute); con direzione "Tutte" usare "Controparte" unico.
- Tutti i filtri passano dal dataProvider (ra-data-postgrest), non da
  filtraggio client-side post-fetch, per coerenza con paginazione e riepilogo.

## SOLID

- Single Responsibility: componenti separati per lista, filtri, riepilogo,
  dettaglio, helper puri. La vista DB resta la fonte aggregata.
- Open/Closed: si aggiunge un modulo al registry, non si modificano switch.
- Liskov/Interface: si riusa il contratto resource read-only di ra-core.
- Dependency Inversion: la UI legge la vista canonica, non ricalcola i totali da
  tabelle grezze.

## TDD / Controlli

Tocca dati finanziari (visualizzazione) -> test sui calcoli/etichette:

- unit test puri: `financialDocumentHelpers` (badge tipo/direzione, label,
  formatter importi) e la funzione di riepilogo (somma totale con note credito
  sottratte, conteggio, gestione filtro vuoto).
- E2E smoke (deterministico, dati di test): la pagina "Fatture" carica, mostra le
  righe attese, il filtro per anno aggiorna lista e riepilogo, il dettaglio si
  apre read-only senza bottoni di modifica.
- Nessun controllore DB nuovo (sola lettura, nessuna migration).

## DeepWiki / RAG Pre-Spec

RAG interrogato (model gemini-2.5-pro) su: registrazione resource/menu,
gestione viste nel provider, assemblaggio contesto AI. Ogni claim verificato sul
sorgente (moduleRegistry shape, primaryKeys della vista, tipi esistenti,
definizione live della vista). Il RAG ha proposto anche un modulo `headless`
per la sola AI: scartato perche' qui vogliamo UI visibile + AI insieme.

## Rischi

- Mostrare `settlement_status` ingannerebbe (allocazioni vuote) -> NON mostrato.
- Nome resource = nome vista (`financial_documents_summary`). VERIFICATO su
  `CRM.tsx:169`: la route ra-core e' `name={module.resource}`, quindi l'URL e'
  sempre `/<resource>`; il campo `path` del registry serve solo ai link di nav.
  Quindi NON si puo' mappare `path:"/fatture"` su questa resource senza rompere
  la nav: `path` DEVE restare `/financial_documents_summary`. Un URL pulito
  `/fatture` richiederebbe `CustomRoutes` dedicate -> fuori scope v1. Il menu
  mostra comunque "Fatture" (label) e il dettaglio/sottotitolo chiariscono che
  include note di credito e documenti ricevuti.
- Note di credito che gonfiano il "Totale fatturato" -> sottrarle nel calcolo.
- RLS: la vista e' `security_invoker = on`; l'accesso dipende dalle policy delle
  tabelle sottostanti (`auth.uid() IS NOT NULL`). Verificare che la lettura
  funzioni con utente autenticato.
- Parita' mobile: nuova card -> verificare che compaia nel menu mobile.

## Criteri Di Accettazione

- Voce di menu "Fatture" (desktop + mobile) apre la lista.
- La lista mostra i 28 documenti reali con numero/data/controparte/tipo/importi;
  filtri direzione/tipo/anno/cliente e ricerca per numero funzionanti.
- Riepilogo in cima coerente col filtro (es. anno 2025 -> totale 2025), note
  credito non gonfiano il totale.
- Dettaglio read-only completo, nessun bottone di modifica/eliminazione.
- Nessuno stato pagamento mostrato.
- L'AI risponde correttamente a "quante fatture ho emesso nel 2025?" / "quanto ho
  fatturato" usando il contesto aggiornato.
- `make typecheck`, `make lint`, `npm run continuity:check`, unit test ed E2E
  smoke verdi.
- Parita' mobile verificata.

## Review Spec

- v1: self-review fatto.
- v2: recepita una review esterna (ChatGPT, no repo). Accettati e verificati sul
  sorgente: riepilogo direction-aware + calcolo su set filtrato completo (pattern
  `admin/count.tsx`); filtro anno come date-range su `issue_date`
  (`DateRangeFilter`); filtro "Controparte"; sezioni "Regole di calcolo
  riepilogo" e "Query/filtering". RESPINTO con verifica: path `/fatture`
  decouplato dal nome resource (route ra-core = `name`, `CRM.tsx:169`) -> fuori
  scope v1.
- Da fare: review MULTI-SUPERFICIE + RAG (provider/resource, AI context,
  UX/mobile, fiscale/totali, test) sul piano, poi review utente.

## Review Gate

1. Review spec (questa).
2. Review piano (multi-superficie + RAG): wiring resource, AI context, calcolo
   riepilogo, surface sweep, test.
3. Review implementazione (multi-superficie + RAG).
4. Review finale: typecheck/lint/test + smoke UI + (se deploy) verifica online.

## Stop Point

- Non mostrare `settlement_status`/"pagato" finche' le allocazioni sono vuote.
- Niente create/edit/delete su questa superficie.
- Niente migration/mutazioni dati in questo ciclo (sola lettura).
