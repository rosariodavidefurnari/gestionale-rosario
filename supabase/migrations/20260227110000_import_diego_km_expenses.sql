-- =============================================================================
-- Supplementary Import: Diego Caltabiano — km travel expenses
-- Creates one "spostamento_km" expense for each service with km_distance > 0
--
-- These are the travel costs (fuel, wear) for each service day.
-- The views (project_financials, monthly_revenue) already track km from
-- services, so these expenses are for the Spese page listing only.
-- =============================================================================

INSERT INTO expenses (project_id, client_id, expense_date, expense_type, km_distance, km_rate, description)
SELECT
  s.project_id,
  p.client_id,
  s.service_date,
  'spostamento_km',
  s.km_distance,
  s.km_rate,
  'Spostamento — ' || COALESCE(s.location, p.name)
FROM services s
JOIN projects p ON s.project_id = p.id
JOIN clients c ON p.client_id = c.id
WHERE c.name = 'Diego Caltabiano'
  AND s.km_distance > 0
ORDER BY s.service_date;
