# Fiscal Cascade Protection - Piano Operativo

Data: 2026-06-14
Stato: draft, da review multi-superficie (RAG) prima dell'esecuzione

Spec di riferimento:
`docs/superpowers/specs/2026-06-14-fiscal-cascade-protection-design.md` (v2).

## Relazione Con La Spec

Il piano esegue la Decisione Di Design v2: (A) flip DB `CASCADE -> NO ACTION` su
4 FK; (B) UX `pessimistic`/`onError` su Client/Project; controllore TDD
single-`DO`; docs canonici. Non aggiunge scope oltre la spec.

## Pre-Requisiti / Stato

- Migration history gia' riconciliata nel ciclo precedente (CANTIERE): remoto ha
  `20260414192200` e `20260614150557`, nessun timestamp fantasma.
- DeepWiki snapshot `gestionale-rosario-current-20260614` (HEAD `39b3e463`).
- Nomi FK reali (verificati live): `financial_documents_client_id_fkey`,
  `projects_client_id_fkey`, `services_project_id_fkey`, `quotes_client_id_fkey`
  (tutte `confdeltype='c'`, non-deferrable).
- Fixture columns reali verificate (NOT NULL/CHECK/UNIQUE) per il controllore.

## File Coinvolti

Nuovi:

- `scripts/check-cascade-protection.sql` (controllore single-`DO`).
- `scripts/check-cascade-protection.mjs` (runner exit-code, opzionale ma previsto).
- `supabase/migrations/<ts>_harden_cascade_protection_fiscal.sql` (migration).

Modificati:

- `package.json` (script `security:check:cascade-protection`).
- `src/components/atomic-crm/clients/ClientShow.tsx` (UX delete).
- `src/components/atomic-crm/projects/ProjectShow.tsx` (UX delete).
- `src/components/admin/delete-button.tsx` SOLO se serve esporre `mutationMode`
  (vedi Step 5 — da verificare).
- Docs canonici (stesso commit): `docs/architecture.md`,
  `docs/development-continuity-map.md`,
  `docs/contacts-client-project-architecture.md`.
- `docs/CANTIERE.md`, `docs/gestionale-roadmap-generale.md`.
- `.claude/rules/learning.md` (trigger DB nuovo se emerge).

## Step

### Step 0 — Gate pre-esecuzione

- `npx supabase migration list --linked` (o MCP `list_migrations`) per
  riconfermare che la history sia allineata. Se divergente: STOP, riconciliare
  prima (come ciclo RLS).
- Ambiente RED/GREEN: Supabase branch come DEFAULT (non opzionale; MCP
  `create_branch`, previa conferma costo). Remoto produzione solo come fallback
  firmato nel CANTIERE, perche' il controllore e' atomico e auto-pulente.
  In ogni caso, query post-run: `SELECT count(*) FROM clients WHERE name LIKE
  'cascade-protection-check-%'` deve dare 0 (nessun residuo del fixture).

### Step 1 — RED: controllore (test-first)

Creare `scripts/check-cascade-protection.sql`. Nota tecnica: in plpgsql NON si
usano `SAVEPOINT` espliciti; il blocco `BEGIN ... EXCEPTION` E' gia' una
subtransazione (rollback automatico sull'eccezione). Contenuto:

```sql
-- Deterministic RED/GREEN checker for fiscal cascade protection (TASK 4).
-- Single anonymous DO block: atomico in autocommit, sicuro via
--   npx supabase db query --linked -f scripts/check-cascade-protection.sql
-- SUCCESS (GREEN): pulisce il fixture, nessun RAISE -> exit 0.
-- FAILURE (RED/regressione): RAISE -> rollback dell'intero blocco -> exit != 0.
DO $$
DECLARE
  v_client uuid; v_project uuid; v_quote uuid; v_doc uuid; v_service uuid;
  v_km int; v_deleted boolean;
  v_tag text := 'cascade-protection-check-' || gen_random_uuid()::text;
BEGIN
  -- 1) fixture (rispetta NOT NULL/CHECK/UNIQUE reali)
  INSERT INTO public.clients (name, client_type)
    VALUES (v_tag, 'azienda_locale') RETURNING id INTO v_client;
  INSERT INTO public.projects (client_id, name, category)
    VALUES (v_client, v_tag, 'spot') RETURNING id INTO v_project;
  INSERT INTO public.quotes (client_id, service_type, amount)
    VALUES (v_client, 'spot', 100) RETURNING id INTO v_quote;
  INSERT INTO public.financial_documents
      (client_id, direction, document_type, document_number, issue_date,
       total_amount, taxable_amount)
    VALUES (v_client, 'outbound', 'customer_invoice', v_tag, current_date, 100, 100)
    RETURNING id INTO v_doc;
  INSERT INTO public.services
      (project_id, client_id, service_date, service_type, fee_shooting, km_distance, km_rate)
    VALUES (v_project, v_client, now(), 'altro', 500, 10, 0.25)  -- 'altro': sicuro anche se i CHECK su service_type venissero ripristinati
    RETURNING id INTO v_service;

  -- 2) cascata legittima km: il trigger sync_service_km_expense deve aver creato la spesa
  SELECT count(*) INTO v_km FROM public.expenses WHERE source_service_id = v_service;
  IF v_km <> 1 THEN
    RAISE EXCEPTION 'SETUP FAIL: trigger km expense non creata (count=%)', v_km;
  END IF;

  -- 3) DELETE client deve essere BLOCCATA
  v_deleted := true;
  BEGIN
    DELETE FROM public.clients WHERE id = v_client;  -- riesce solo in stato RED
  EXCEPTION WHEN foreign_key_violation THEN
    v_deleted := false;                               -- GREEN: bloccata
  END;
  IF v_deleted THEN
    RAISE EXCEPTION 'FAIL: DELETE client NON bloccata (cascade ancora attivo)';
  END IF;

  -- 4) DELETE project deve essere BLOCCATA
  v_deleted := true;
  BEGIN
    DELETE FROM public.projects WHERE id = v_project;
  EXCEPTION WHEN foreign_key_violation THEN
    v_deleted := false;
  END;
  IF v_deleted THEN
    RAISE EXCEPTION 'FAIL: DELETE project NON bloccata (cascade su services attivo)';
  END IF;

  -- 5) contenuto fiscale invariato dopo i tentativi bloccati
  PERFORM 1 FROM public.financial_documents
    WHERE id = v_doc AND total_amount = 100 AND taxable_amount = 100
      AND document_number = v_tag;
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: fattura alterata/distrutta dopo blocco'; END IF;

  -- 5b) money TDD: la view derivata (dashboard + AI) riflette ancora i dati
  PERFORM 1 FROM public.project_financials
    WHERE project_id = v_project AND total_fees = 500;
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: project_financials.total_fees alterato dopo blocco'; END IF;

  -- 6) cascata legittima preservata: DELETE service riesce e rimuove la km derivata
  DELETE FROM public.services WHERE id = v_service;
  SELECT count(*) INTO v_km FROM public.expenses WHERE source_service_id = v_service;
  IF v_km <> 0 THEN
    RAISE EXCEPTION 'FAIL: cascata km rotta (spesa km non rimossa, count=%)', v_km;
  END IF;

  -- 7) cleanup deterministico (su SUCCESS non resta nulla)
  DELETE FROM public.financial_documents WHERE id = v_doc;
  DELETE FROM public.quotes WHERE id = v_quote;
  DELETE FROM public.projects WHERE id = v_project;
  DELETE FROM public.clients WHERE id = v_client;

  RAISE NOTICE 'cascade-protection: GREEN';
END $$;
```

Aggiungere a `package.json`:

```json
"security:check:cascade-protection": "supabase db query --linked -f scripts/check-cascade-protection.sql"
```

Eseguire RED (PRIMA della migration):

- comando: `npm run security:check:cascade-protection`
- output atteso RED: ERRORE
  `FAIL: DELETE client NON bloccata (cascade ancora attivo)` ed exit != 0
  (perche' oggi la DELETE client RIESCE e cascata). Documentare l'output reale
  (testo errore + `echo $?` != 0).
- dipendenza dichiarata: tutto il RED/GREEN si appoggia all'exit-code != 0 di
  `db query` su `RAISE EXCEPTION` (precedente provato:
  `scripts/check-fiscal-backup-rls.sql` + `security:check:fiscal-backups`). Se la
  Management API normalizzasse l'exit a 0, usare il runner
  `scripts/check-cascade-protection.mjs` per parsare l'output e forzare l'exit
  corretto (PASS solo sul NOTICE GREEN finale, FAIL su qualsiasi `FAIL:`/`SETUP`).

### Step 2 — GREEN: migration

`npx supabase migration new harden_cascade_protection_fiscal`, contenuto:

```sql
-- TASK 4: protezione storia fiscale/finanziaria dalle cancellazioni a cascata.
-- Flip ON DELETE CASCADE -> NO ACTION su 4 FK padre. Non distruttiva, replayable.
-- Nomi constraint = quelli auto-generati inline (verificati su pg_constraint live).

ALTER TABLE public.financial_documents
  DROP CONSTRAINT IF EXISTS financial_documents_client_id_fkey;
ALTER TABLE public.financial_documents
  ADD CONSTRAINT financial_documents_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id);  -- NO ACTION (default)

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id);

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_project_id_fkey;
ALTER TABLE public.services
  ADD CONSTRAINT services_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_client_id_fkey;
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id);
```

Nota: l'`ADD CONSTRAINT` non specifica `ON DELETE` -> NO ACTION (coerente con
`payments`/`expenses`). La ricreazione non cambia la nullability delle colonne.

### Step 3 — Applicare

- Verificare di nuovo lo stato history (Step 0).
- Metodo PRIMARIO (coerente col ciclo RLS precedente, CANTIERE:118-120;
  `db push` e' diff-based e con history non perfettamente allineata puo'
  divergere):
  - applicare la sola migration:
    `npx supabase db query --linked -f supabase/migrations/<ts>_harden_cascade_protection_fiscal.sql`
  - registrare il metadata nella history remota:
    `npx supabase migration repair --status applied <ts> --linked`
- `npx supabase db push` SOLO se `npx supabase migration list --linked` mostra la
  history perfettamente allineata e nessun altro file non applicato.
- Decisione e output registrati nel CANTIERE prima di proseguire.

### Step 4 — GREEN + verifica FK

- `npm run security:check:cascade-protection` -> deve PASSARE (exit 0, NOTICE
  GREEN).
- Query di verifica FK (attesa: 4 righe, tutte `confdeltype='a'`, nessuna `'c'`,
  una sola FK per colonna):

```sql
SELECT con.conname, con.conrelid::regclass AS child, con.confdeltype
FROM pg_constraint con
WHERE con.contype='f' AND con.connamespace='public'::regnamespace
  AND con.conname IN ('financial_documents_client_id_fkey','projects_client_id_fkey',
                      'services_project_id_fkey','quotes_client_id_fkey')
ORDER BY child;
```

- Check anti doppia-FK per colonna (deve ritornare 0 righe — nessuna seconda FK
  con nome non-canonico sulla stessa colonna):

```sql
SELECT conrelid::regclass AS tbl, conkey, count(*)
FROM pg_constraint
WHERE contype='f' AND connamespace='public'::regnamespace
  AND conrelid IN ('public.financial_documents'::regclass,'public.projects'::regclass,
                   'public.services'::regclass,'public.quotes'::regclass)
GROUP BY conrelid, conkey
HAVING count(*) > 1;
```

### Step 5 — UX della protezione (Client + Project)

Obiettivo 3: l'errore di blocco appare PRIMA di qualsiasi (falso) successo
ottimistico, con messaggio italiano comprensibile.

Fatti verificati sul sorgente ra-core (NON assunti):

- `delete-button.tsx:64` usa `useDeleteWithUndoController`, che chiama
  `useDeleteController({ ...props, mutationMode: 'undoable' })`.
- in `useDeleteController.handleDelete`:
  `deleteOne(..., { mutationMode, ...otherMutationOptions })` -> lo spread di
  `otherMutationOptions` (= `mutationOptions` meno `meta`) viene DOPO, quindi
  `mutationOptions.mutationMode` SOVRASCRIVE la DELETE reale. MA la `onSuccess`
  interna fa `notify(..., { undoable: mutationMode === 'undoable' })` leggendo il
  `mutationMode` TOP-LEVEL (sempre 'undoable' nel path DeleteButton) -> toast
  "Annulla" FANTASMA anche su delete pessimistic riuscito.
- l'errore PostgREST porta il codice su `error.body.code`, NON `error.code`
  (HttpError ra-core: `message, status, body`).

Decisione singola (deterministica, riusabile): estendere
`src/components/admin/delete-button.tsx` con prop opzionale
`mutationMode?: "undoable" | "pessimistic"` (default `"undoable"`,
retrocompatibile per tutti i consumer esistenti). Implementazione: usare
`useDeleteController` direttamente passando il `mutationMode` reale (non il
wrapper `useDeleteWithUndoController` che lo forza a 'undoable'), preservando
`onClick` + `event.stopPropagation`. Cosi' la `onSuccess` legge il mutationMode
giusto -> niente toast fantasma, e l'errore arriva prima di ogni successo.

Applicare su `clients/ClientShow.tsx:179` e `projects/ProjectShow.tsx:164`:
`mutationMode="pessimistic"` + `mutationOptions={{ onError }}`:

```ts
onError: (error) => {
  const code = (error as any)?.body?.code;            // PostgREST -> error.body.code
  notify(
    code === "23503"
      ? "Impossibile eliminare: ci sono fatture, progetti o preventivi collegati. Elimina o scollega prima quelli."
      : ((error as any)?.message ?? "ra.notification.http_error"),
    { type: "error" },
  );
}
```

Scartati (con motivo):

- passare SOLO `mutationOptions={{ mutationMode }}` senza estendere il
  componente: la DELETE diventa pessimistic ma resta il toast "Annulla" fantasma
  (onSuccess legge il mutationMode top-level). Non soddisfa l'Obiettivo 3.
- `ContactShow.tsx:278` NON e' un precedente DeleteButton: e' un
  `deleteOne(project_contacts, { mutationMode: 'pessimistic' })` via `useDelete`.

Verifica runtime (Step 6): (a) delete client CON figli -> messaggio italiano,
record NON sparisce; (b) delete senza figli -> successo SENZA toast "Annulla";
(c) mobile (i due Show sono condivisi, nessun consumer separato).

Follow-up NON bloccante (backlog, non in questo slice): stesso trattamento per
`quotes` (QuoteShowActions/QuoteEdit) e bulk delete `services` — gia' oggi
rifiutabili da `payments.quote_id` NO ACTION (comportamento pre-esistente, non
introdotto da TASK 4).

### Step 6 — Verifiche finali

- `make typecheck`
- `make lint`
- `npm run continuity:check`
- `npm run security:check:cascade-protection` (GREEN)
- render check UI (glance/playwright) del messaggio d'errore su Client delete con
  figli (screenshot), per non lasciare la UX non verificata.

### Step 7 — Documentazione (stesso commit del codice)

- `docs/architecture.md`: nota su FK NO ACTION protettive + UX delete pessimistic.
- `docs/development-continuity-map.md`: sweep e controllore nuovi.
- `docs/contacts-client-project-architecture.md`: comportamento delete
  client/project ora bloccato con figli.
- `docs/CANTIERE.md`: stato, prossima azione, controllore, gate.
- `docs/gestionale-roadmap-generale.md`: TASK 4 chiuso.
- `.claude/rules/learning.md`: eventuale trigger DB (es. "spostare cascade ->
  NO ACTION richiede controllore single-DO + UX pessimistic").

## RED / GREEN (sintesi comandi)

- RED: `npm run security:check:cascade-protection` -> FAIL (cascade attivo).
- Applica migration (Step 3).
- GREEN: `npm run security:check:cascade-protection` -> PASS + query FK
  conferma `confdeltype='a'` su tutte e 4.

## Controllori

- nuovo: `scripts/check-cascade-protection.sql` (+ `.mjs` runner) +
  `security:check:cascade-protection`.
- esistenti che devono restare verdi: `continuity:check`, `typecheck`, `lint`.

## Documentazione

Vedi Step 7. Tutto nello stesso commit (COMMIT GATE / WF-6).

## Stop Point

- history divergente allo Step 0 -> STOP.
- RED non riproduce il fallimento (cascade gia' assente) -> STOP e rivedere.
- SQL con `DROP/DELETE/TRUNCATE` di dati o flip di una FK "non toccare" -> STOP.
- dopo la migration resta una `confdeltype='c'` sulle 4 colonne o doppia FK -> STOP.
- la UX mostra ancora falso successo + errore grezzo -> STOP (UX non accettata).

## Review Richieste

1. Review piano: MULTI-SUPERFICIE + RAG (DB, fiscale, frontend, provider, TDD).
2. Review implementazione: MULTI-SUPERFICIE + RAG dopo migration + UX.
3. Review finale: output RED->GREEN, FK verificate, docs aggiornati.
