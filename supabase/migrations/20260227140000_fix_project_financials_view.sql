-- =============================================================================
-- Fix: project_financials view had a Cartesian product bug
-- When a project had N services and M payments, the JOIN produced N×M rows,
-- inflating all aggregated sums. Fix: pre-aggregate in subqueries.
-- =============================================================================

CREATE OR REPLACE VIEW public.project_financials AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  c.name AS client_name,
  p.category,
  COALESCE(sv.total_services, 0) AS total_services,
  COALESCE(sv.total_fees, 0) AS total_fees,
  COALESCE(sv.total_km, 0) AS total_km,
  COALESCE(sv.total_km_cost, 0) AS total_km_cost,
  COALESCE(pv.total_paid, 0) AS total_paid,
  COALESCE(sv.total_fees, 0) - COALESCE(pv.total_paid, 0) AS balance_due
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
    SUM(amount) FILTER (WHERE status = 'ricevuto') AS total_paid
  FROM public.payments
  GROUP BY project_id
) pv ON pv.project_id = p.id;
