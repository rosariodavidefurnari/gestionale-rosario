-- DateTime range support: DATE → TIMESTAMPTZ + all_day flag on all modules

-- ═══════════════════════════════════════════════════════════════════
-- 1. QUOTES: event_date → event_start + event_end + all_day
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.quotes
  ADD COLUMN event_start TIMESTAMPTZ,
  ADD COLUMN event_end TIMESTAMPTZ,
  ADD COLUMN all_day BOOLEAN NOT NULL DEFAULT true;

-- Migrate existing event_date data into event_start
UPDATE public.quotes
SET event_start = event_date::TIMESTAMPTZ
WHERE event_date IS NOT NULL;

-- Drop old column
ALTER TABLE public.quotes DROP COLUMN event_date;

-- ═══════════════════════════════════════════════════════════════════
-- 2. PROJECTS: start_date/end_date DATE → TIMESTAMPTZ + all_day
-- ═══════════════════════════════════════════════════════════════════

-- Drop date range CHECK first (incompatible during ALTER TYPE)
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS chk_project_date_range;

-- Convert DATE → TIMESTAMPTZ
ALTER TABLE public.projects
  ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date::TIMESTAMPTZ,
  ALTER COLUMN end_date TYPE TIMESTAMPTZ USING end_date::TIMESTAMPTZ;

-- Add all_day flag
ALTER TABLE public.projects
  ADD COLUMN all_day BOOLEAN NOT NULL DEFAULT true;

-- Recreate CHECK for date range (works identically with TIMESTAMPTZ)
ALTER TABLE public.projects
  ADD CONSTRAINT chk_project_date_range
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

-- ═══════════════════════════════════════════════════════════════════
-- 3. SERVICES: service_date DATE → TIMESTAMPTZ + service_end + all_day
--    Must DROP dependent views first, then RECREATE after ALTER TYPE
-- ═══════════════════════════════════════════════════════════════════

-- Drop views that depend on services.service_date
DROP VIEW IF EXISTS public.monthly_revenue;
DROP VIEW IF EXISTS public.project_financials;

ALTER TABLE public.services
  ALTER COLUMN service_date TYPE TIMESTAMPTZ USING service_date::TIMESTAMPTZ;

ALTER TABLE public.services
  ADD COLUMN service_end TIMESTAMPTZ,
  ADD COLUMN all_day BOOLEAN NOT NULL DEFAULT true;

-- Recreate monthly_revenue view (same definition, now uses TIMESTAMPTZ)
CREATE OR REPLACE VIEW public.monthly_revenue AS
SELECT
  DATE_TRUNC('month', s.service_date) AS month,
  p.category,
  SUM(s.fee_shooting + s.fee_editing + s.fee_other - s.discount) AS revenue,
  SUM(s.km_distance) AS total_km,
  SUM(s.km_distance * s.km_rate) AS km_cost
FROM public.services s
JOIN public.projects p ON s.project_id = p.id
GROUP BY DATE_TRUNC('month', s.service_date), p.category
ORDER BY month DESC;

-- Recreate project_financials view (latest definition from audit_constraints)
CREATE VIEW public.project_financials AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  c.name AS client_name,
  p.category,
  COALESCE(sv.total_services, 0) AS total_services,
  COALESCE(sv.total_fees, 0) AS total_fees,
  COALESCE(sv.total_km, 0) AS total_km,
  COALESCE(sv.total_km_cost, 0) AS total_km_cost,
  COALESCE(ev.total_expenses, 0) AS total_expenses,
  COALESCE(pv.total_paid, 0) AS total_paid,
  COALESCE(sv.total_fees, 0) + COALESCE(ev.total_expenses, 0) - COALESCE(pv.total_paid, 0) AS balance_due
FROM public.projects p
JOIN public.clients c ON p.client_id = c.id
LEFT JOIN (
  SELECT
    project_id,
    COUNT(*) AS total_services,
    SUM(fee_shooting + fee_editing + fee_other - discount) AS total_fees,
    SUM(km_distance) AS total_km,
    SUM(km_distance * km_rate) AS total_km_cost
  FROM public.services
  GROUP BY project_id
) sv ON sv.project_id = p.id
LEFT JOIN (
  SELECT
    project_id,
    SUM(
      CASE
        WHEN expense_type = 'credito_ricevuto' THEN -COALESCE(amount, 0)
        WHEN expense_type = 'spostamento_km' THEN COALESCE(km_distance * km_rate, 0)
        ELSE COALESCE(amount, 0) * (1 + COALESCE(markup_percent, 0) / 100.0)
      END
    ) AS total_expenses
  FROM public.expenses
  WHERE project_id IS NOT NULL
  GROUP BY project_id
) ev ON ev.project_id = p.id
LEFT JOIN (
  SELECT
    project_id,
    SUM(
      CASE
        WHEN payment_type = 'rimborso' THEN -amount
        ELSE amount
      END
    ) FILTER (WHERE status = 'ricevuto') AS total_paid
  FROM public.payments
  GROUP BY project_id
) pv ON pv.project_id = p.id;

-- ═══════════════════════════════════════════════════════════════════
-- 4. CLIENT_TASKS: add all_day (due_date is already TIMESTAMPTZ)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.client_tasks
  ADD COLUMN all_day BOOLEAN NOT NULL DEFAULT true;
