# Registro Lavori — Friction Quick-Wins (ponte fattura + badge fatturato)

Data: 2026-06-17
Stato: draft
Origine: diagnosi frizione UX (`whah0a0sf`) + flusso reale utente: inserisce il
lavoro nel registro lavori (services), salta quasi sempre il preventivo, poi
vuole fatturare e incassare.

## Problema

1. **Vicolo cieco fattura dal registro lavori**: da un servizio (`ServiceShow`)
   il bottone "Genera bozza fattura" apre il dialog ma NON ha l'azione "Emetti"
   (gate `source.kind in project/client`; il servizio e' `kind=service`). L'utente
   resta bloccato proprio dove parte piu' spesso.
2. **Fatturato invisibile nel registro lavori**: nella lista servizi non si vede
   quali lavori sono gia' fatturati (`invoice_ref` valorizzato) e quali no. Il
   dato c'e' ma e' invisibile in lista.

## Obiettivo (slice piccola, basso rischio, frontend-only)

- A) **Ponte emit dal servizio**: da `ServiceShow`, se il servizio appartiene a
  un progetto e non e' ancora fatturato, mostrare un'azione primaria
  "Emetti la fattura del progetto" che naviga a
  `/projects/<project_id>/show?invoiceDraft=true` (dove l'emit funziona e
  raggruppa tutti i lavori non fatturati del progetto). Nessuna logica fiscale
  nuova: solo navigazione verso la superficie giusta.
- B) **Badge fatturazione nel registro lavori**: in lista desktop
  (`ServiceListContent`) e card mobile (`ServiceMobileCard`) un badge
  "Fatturato" / "Da fatturare" derivato da `invoice_ref`; + filtro
  "Stato fatturazione" in `ServiceListFilter`.

## Non-obiettivi

- NON abilitare l'emit di una fattura per singolo servizio (la fattura
  raggruppa il progetto): per ora il ponte porta al progetto. Emit per-servizio
  = decisione separata/futura.
- NON toccare la logica fiscale/emit gia' in prod.
- NON gestire preventivo (lo salti) in questa slice.

## Fonti di verita' (verificate su sorgente)

- `ProjectShow.tsx:128` — `?invoiceDraft=true` auto-apre la bozza progetto se
  `hasCollectableAmount`; la bozza progetto ha l'azione Emetti (source=project).
- `ServiceShow.tsx:75-186` — `ServiceHeader`: ha `record.project_id`,
  `record.invoice_ref`, action row (riga 165-178).
- Servizio fatturato ⇔ `invoice_ref` valorizzato (builder filtrano
  `!invoice_ref || trim()==''`).
- Sweep services: `ServiceListContent.tsx`, `ServiceMobileCard.tsx`,
  `ServiceListFilter.tsx`, `serviceLinking.ts` (helpers).

## Decisioni di design

- Helper puro `isServiceBilled(service): boolean` (= `invoice_ref` non vuoto) +
  `serviceBillingLabel(service): "Fatturato" | "Da fatturare"`, in
  `services/serviceBilling.ts` (testabile), riusato da lista + card.
- Helper puro `buildProjectInvoiceEmitPath(projectId): string` =
  `/projects/<id>/show?invoiceDraft=true` (testabile).
- Ponte in `ServiceShow`: bottone primario quando `project_id && !isServiceBilled`
  → `useRedirect`/navigate al path. "Genera bozza fattura" resta come secondario.
- Badge: `<Badge>` emerald "Fatturato" / amber "Da fatturare". In lista una
  colonna/indicatore; su mobile una riga nel card.
- Filtro: "Stato fatturazione" → da fatturare = `invoice_ref@is=null`,
  fatturato = `invoice_ref@not.is=null` (verificare sintassi ra-data-postgrest
  sul pattern dei filtri esistenti).

## Invarianti / rischi

- Frontend-only, nessuna migration, nessuna EF, nessuna scrittura nuova.
- Il ponte e' pura navigazione: se il progetto non ha importo fatturabile, la
  bozza non si apre (gate esistente) — nessun errore.
- Parita' desktop/mobile (UI-7): badge sia in lista sia in card mobile.
- Mandatory Surface Sweep services: list/show/mobile/filter coperti.

## Controllori (test)

- `isServiceBilled` / `serviceBillingLabel`: con/ senza `invoice_ref`, stringa
  vuota, spazi.
- `buildProjectInvoiceEmitPath`: ritorna il path atteso.
- (UI gia' coperta dal type-check + render manuale; niente E2E nuovo per slice
  display.)

## Criteri di accettazione

- Da un servizio non fatturato con progetto: appare "Emetti la fattura del
  progetto" → porta alla bozza progetto con Emetti.
- In lista/mobile ogni servizio mostra Fatturato/Da fatturare; il filtro
  funziona.
- typecheck/lint/test verdi; nessuna regressione sui flussi esistenti.

## Review gate

- Review implementazione multi-superficie + RAG (services sweep + navigazione)
  prima del merge. Niente prod gated separato (frontend → Vercel su merge main).
