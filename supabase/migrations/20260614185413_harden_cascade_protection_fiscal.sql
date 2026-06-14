-- TASK 4 — Fiscal Cascade Protection
-- Protegge la storia fiscale/finanziaria dalle cancellazioni a cascata:
-- cancellare un client (o un project) non deve piu' distruggere in silenzio le
-- sue fatture/progetti/preventivi (o i suoi servizi).
--
-- Flip ON DELETE CASCADE -> NO ACTION sulle 4 FK padre. NO ACTION per coerenza
-- con le protezioni gia' presenti (payments/expenses sono NO ACTION); ai fini
-- del blocco e' equivalente a RESTRICT (nessuna FK del progetto e' DEFERRABLE).
--
-- Non distruttiva e replayable: solo DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT
-- con lo stesso nome canonico auto-generato inline. NO ACTION non richiede
-- backfill (vincola solo cancellazioni future).
-- Le cascate legittime (expenses.source_service_id, allocazioni,
-- fiscal_f24_payment_lines, ...) NON vengono toccate.
--
-- ATOMICA: avvolta in BEGIN/COMMIT. L'ADD CONSTRAINT ri-valida le righe
-- esistenti; se ci fossero orfani fallisce, e la transazione fa rollback senza
-- lasciare lo schema a meta' (FK droppata ma non ricreata). Pre-requisito:
-- 0 record orfani sulle 4 relazioni (verificato su remoto prima di applicare).

BEGIN;

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

COMMIT;
