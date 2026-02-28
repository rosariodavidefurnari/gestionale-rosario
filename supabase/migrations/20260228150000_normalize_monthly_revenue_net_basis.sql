-- Normalize monthly_revenue to the same net basis used by the annual dashboard:
-- service fees net of discount, still grouped by service month and project category.

DROP VIEW IF EXISTS public.monthly_revenue;

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
