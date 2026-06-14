-- Deterministic RED/GREEN checker for fiscal cascade protection (TASK 4).
--
-- Verifies that deleting a parent (client/project) is BLOCKED when it still has
-- fiscal/financial children via the FOUR target FKs (financial_documents,
-- projects, quotes -> clients ; services -> projects), while the legitimate
-- child cascade (km expense from the sync_service_km_expense trigger) keeps
-- working.
--
-- IMPORTANT (isolation): the km expense created by the trigger references
-- expenses.client_id and expenses.project_id, both ON DELETE NO ACTION. Those
-- would block the parent deletes for the WRONG reason and mask the target FKs.
-- So the km cascade is tested first with its own service, which is then deleted
-- (removing the confounding expense) BEFORE the parent-delete assertions, which
-- use a service WITHOUT km.
--
-- Single anonymous DO block: ONE statement -> atomic in autocommit.
-- GREEN: cleans up its throwaway fixture, exits 0.
-- RED/regression: RAISE -> whole block rolls back (no data persists) -> exit != 0.
--
-- Run (LOCAL):  psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f scripts/check-cascade-protection.sql
-- Run (REMOTE): npx supabase db query --linked -f scripts/check-cascade-protection.sql
--
-- NOTE: plpgsql BEGIN/EXCEPTION blocks ARE subtransactions; explicit SAVEPOINTs
-- are not allowed inside plpgsql and are not used here.
DO $$
DECLARE
  v_client      uuid;
  v_project     uuid;
  v_quote       uuid;
  v_doc         uuid;
  v_service_km  uuid;
  v_service     uuid;
  v_km          int;
  v_fk          int;
  v_deleted     boolean;
  v_tag         text := 'cascade-protection-check-' || gen_random_uuid()::text;
BEGIN
  -- 0) per-FK metadata gate: ognuna delle 4 FK target deve essere NO ACTION ('a').
  --    Chiude il rischio "false GREEN per-FK" (la DELETE client cattura QUALSIASI
  --    foreign_key_violation; senza questo gate il blocco potrebbe arrivare da una
  --    sola FK mentre un'altra resta CASCADE). In stato RED le FK sono 'c' -> FAIL qui.
  SELECT count(*) INTO v_fk
  FROM pg_constraint
  WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    AND conname IN ('financial_documents_client_id_fkey', 'projects_client_id_fkey',
                    'services_project_id_fkey', 'quotes_client_id_fkey')
    AND confdeltype = 'a';
  IF v_fk <> 4 THEN
    RAISE EXCEPTION 'FAIL: attese 4 FK target con NO ACTION, trovate % (FK ancora CASCADE?)', v_fk;
  END IF;
  -- 1) throwaway fixture (rispetta NOT NULL / CHECK / UNIQUE reali)
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

  -- 2) legittima cascata km (isolata): service con km -> trigger crea la spesa;
  --    cancellando il service la spesa derivata deve sparire (FK source_service_id CASCADE).
  INSERT INTO public.services
      (project_id, client_id, service_date, service_type, km_distance, km_rate)
    VALUES (v_project, v_client, now(), 'altro', 10, 0.25)
    RETURNING id INTO v_service_km;
  SELECT count(*) INTO v_km FROM public.expenses WHERE source_service_id = v_service_km;
  IF v_km <> 1 THEN
    RAISE EXCEPTION 'SETUP FAIL: trigger km expense non creata (count=%)', v_km;
  END IF;
  DELETE FROM public.services WHERE id = v_service_km;     -- consentito (figlio), rimuove la km
  SELECT count(*) INTO v_km FROM public.expenses WHERE source_service_id = v_service_km;
  IF v_km <> 0 THEN
    RAISE EXCEPTION 'FAIL: cascata km rotta (spesa km non rimossa col service, count=%)', v_km;
  END IF;

  -- 3) service SENZA km per i test di blocco padre (nessuna spesa confondente).
  --    fee_shooting=500 per asserire project_financials.total_fees.
  INSERT INTO public.services
      (project_id, client_id, service_date, service_type, fee_shooting, km_distance)
    VALUES (v_project, v_client, now(), 'altro', 500, 0)
    RETURNING id INTO v_service;
  IF EXISTS (SELECT 1 FROM public.expenses WHERE source_service_id = v_service) THEN
    RAISE EXCEPTION 'SETUP FAIL: il service senza km non deve generare spesa';
  END IF;

  -- 4) DELETE client deve essere BLOCCATA dalle FK target (financial_documents/projects/quotes)
  v_deleted := true;
  BEGIN
    DELETE FROM public.clients WHERE id = v_client;   -- riesce (cascade) solo in stato RED
  EXCEPTION WHEN foreign_key_violation THEN
    v_deleted := false;                               -- GREEN: bloccata
  END;
  IF v_deleted THEN
    RAISE EXCEPTION 'FAIL: DELETE client NON bloccata (cascade ancora attivo su financial_documents/projects/quotes)';
  END IF;

  -- 5) DELETE project deve essere BLOCCATA dalla FK target services.project_id
  v_deleted := true;
  BEGIN
    DELETE FROM public.projects WHERE id = v_project;
  EXCEPTION WHEN foreign_key_violation THEN
    v_deleted := false;
  END;
  IF v_deleted THEN
    RAISE EXCEPTION 'FAIL: DELETE project NON bloccata (cascade ancora attivo su services)';
  END IF;

  -- 6) contenuto fiscale invariato dopo i blocchi
  PERFORM 1 FROM public.financial_documents
    WHERE id = v_doc AND total_amount = 100 AND taxable_amount = 100
      AND document_number = v_tag AND issue_date = current_date;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL: fattura alterata/distrutta dopo il blocco';
  END IF;

  -- 6b) money TDD: la view derivata (dashboard + AI) riflette ancora i dati
  PERFORM 1 FROM public.project_financials
    WHERE project_id = v_project AND total_fees = 500;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL: project_financials.total_fees alterato dopo il blocco';
  END IF;

  -- 7) cleanup deterministico (su SUCCESS non resta nulla)
  DELETE FROM public.services            WHERE id = v_service;
  DELETE FROM public.financial_documents WHERE id = v_doc;
  DELETE FROM public.quotes              WHERE id = v_quote;
  DELETE FROM public.projects            WHERE id = v_project;
  DELETE FROM public.clients             WHERE id = v_client;

  RAISE NOTICE 'cascade-protection: GREEN (protezioni attive, cascate legittime intatte)';
END $$;
