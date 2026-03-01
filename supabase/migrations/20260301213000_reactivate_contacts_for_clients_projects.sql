-- Reactivate CRM contacts on top of the current gestionale domain.
-- We keep legacy public.contacts, but link it to current clients and projects
-- instead of restoring the old companies/deals model.

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.contacts
SET
  email_jsonb = COALESCE(email_jsonb, '[]'::jsonb),
  phone_jsonb = COALESCE(phone_jsonb, '[]'::jsonb),
  tags = COALESCE(tags, '{}'::BIGINT[]),
  updated_at = COALESCE(updated_at, NOW())
WHERE
  email_jsonb IS NULL
  OR phone_jsonb IS NULL
  OR tags IS NULL
  OR updated_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id BIGINT NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_contacts_project_contact_unique UNIQUE (project_id, contact_id)
);

ALTER TABLE public.project_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_project_contacts" ON public.project_contacts;
CREATE POLICY "auth_all_project_contacts" ON public.project_contacts
  FOR ALL USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON public.contacts (client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON public.contacts (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_contacts_project_id ON public.project_contacts (project_id);
CREATE INDEX IF NOT EXISTS idx_project_contacts_contact_id ON public.project_contacts (contact_id);
