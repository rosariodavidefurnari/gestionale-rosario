-- Client billing profiles:
-- keep clients as operational accounts, and attach optional fiscal recipient
-- profiles to issued documents without duplicating projects or contacts.

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_billing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  label text NOT NULL,
  billing_name text NOT NULL,
  vat_number text,
  fiscal_code text,
  billing_address_street text,
  billing_address_number text,
  billing_postal_code text,
  billing_city text,
  billing_province text,
  billing_country text DEFAULT 'IT',
  billing_sdi_code text,
  billing_pec text,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_billing_profiles_client_id_idx
  ON public.client_billing_profiles(client_id);

CREATE INDEX IF NOT EXISTS client_billing_profiles_vat_number_idx
  ON public.client_billing_profiles(vat_number)
  WHERE vat_number IS NOT NULL AND vat_number <> '';

CREATE INDEX IF NOT EXISTS client_billing_profiles_fiscal_code_idx
  ON public.client_billing_profiles(fiscal_code)
  WHERE fiscal_code IS NOT NULL AND fiscal_code <> '';

CREATE UNIQUE INDEX IF NOT EXISTS client_billing_profiles_one_default_per_client_idx
  ON public.client_billing_profiles(client_id)
  WHERE is_default;

ALTER TABLE public.client_billing_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access"
  ON public.client_billing_profiles;
CREATE POLICY "Authenticated full access"
  ON public.client_billing_profiles
  FOR ALL USING ((select auth.uid()) IS NOT NULL);

DROP TRIGGER IF EXISTS trg_client_billing_profiles_updated_at
  ON public.client_billing_profiles;
CREATE TRIGGER trg_client_billing_profiles_updated_at
  BEFORE UPDATE ON public.client_billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.financial_documents
  ADD COLUMN IF NOT EXISTS billing_profile_id uuid
  REFERENCES public.client_billing_profiles(id);

CREATE INDEX IF NOT EXISTS financial_documents_billing_profile_id_idx
  ON public.financial_documents(billing_profile_id)
  WHERE billing_profile_id IS NOT NULL;

DROP VIEW IF EXISTS public.financial_documents_summary;
CREATE VIEW public.financial_documents_summary AS
WITH cash_totals AS (
  SELECT
    document_id,
    ROUND(SUM(allocation_amount)::numeric, 2) AS settled_amount
  FROM public.financial_document_cash_allocations
  GROUP BY document_id
),
project_totals AS (
  SELECT
    fdpa.document_id,
    COUNT(*) AS project_allocations_count,
    STRING_AGG(COALESCE(p.name, '(non allocato)'), ' · ' ORDER BY p.name NULLS LAST) AS project_names
  FROM public.financial_document_project_allocations fdpa
  LEFT JOIN public.projects p ON p.id = fdpa.project_id
  GROUP BY fdpa.document_id
)
SELECT
  fd.id,
  fd.client_id,
  fd.supplier_id,
  fd.billing_profile_id,
  c.name AS client_name,
  s.name AS supplier_name,
  bp.label AS billing_profile_label,
  bp.billing_name AS billing_profile_name,
  bp.vat_number AS billing_profile_vat_number,
  bp.fiscal_code AS billing_profile_fiscal_code,
  bp.billing_address_street AS billing_profile_address_street,
  bp.billing_address_number AS billing_profile_address_number,
  bp.billing_postal_code AS billing_profile_postal_code,
  bp.billing_city AS billing_profile_city,
  bp.billing_province AS billing_profile_province,
  bp.billing_country AS billing_profile_country,
  bp.billing_sdi_code AS billing_profile_sdi_code,
  bp.billing_pec AS billing_profile_pec,
  fd.direction,
  fd.xml_document_code,
  fd.document_type,
  fd.related_document_number,
  fd.document_number,
  fd.issue_date,
  fd.due_date,
  fd.total_amount,
  fd.taxable_amount,
  fd.tax_amount,
  fd.stamp_amount,
  LEAST(fd.total_amount, COALESCE(ct.settled_amount, 0)) AS settled_amount,
  GREATEST(
    fd.total_amount - LEAST(fd.total_amount, COALESCE(ct.settled_amount, 0)),
    0
  ) AS open_amount,
  CASE
    WHEN GREATEST(
      fd.total_amount - LEAST(fd.total_amount, COALESCE(ct.settled_amount, 0)),
      0
    ) <= 0.009 THEN 'settled'
    WHEN LEAST(fd.total_amount, COALESCE(ct.settled_amount, 0)) > 0 THEN 'partial'
    WHEN fd.due_date IS NOT NULL AND fd.due_date < (NOW() AT TIME ZONE 'Europe/Rome')::date THEN 'overdue'
    ELSE 'open'
  END AS settlement_status,
  COALESCE(pt.project_allocations_count, 0) AS project_allocations_count,
  pt.project_names,
  fd.currency_code,
  fd.source_path,
  fd.notes,
  fd.created_at,
  fd.updated_at
FROM public.financial_documents fd
LEFT JOIN public.clients c ON c.id = fd.client_id
LEFT JOIN public.suppliers s ON s.id = fd.supplier_id
LEFT JOIN public.client_billing_profiles bp ON bp.id = fd.billing_profile_id
LEFT JOIN cash_totals ct ON ct.document_id = fd.id
LEFT JOIN project_totals pt ON pt.document_id = fd.id;

ALTER VIEW public.financial_documents_summary SET (security_invoker = on);

COMMIT;
