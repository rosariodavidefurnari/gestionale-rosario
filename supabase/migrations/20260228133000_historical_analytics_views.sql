-- Historical analytics views for dashboard and future AI interpretation.
-- Canonical basis for v1 historical revenue: competence revenue from services,
-- evaluated in the Europe/Rome business timezone.

DROP VIEW IF EXISTS public.analytics_client_lifetime_competence_revenue;
DROP VIEW IF EXISTS public.analytics_yearly_competence_revenue_by_category;
DROP VIEW IF EXISTS public.analytics_yearly_competence_revenue;
DROP VIEW IF EXISTS public.analytics_history_meta;
DROP VIEW IF EXISTS public.analytics_business_clock;

CREATE OR REPLACE VIEW public.analytics_business_clock
WITH (security_invoker = on) AS
SELECT
  1 AS id,
  'Europe/Rome'::text AS business_timezone,
  timezone('Europe/Rome', now()) AS as_of_ts,
  timezone('Europe/Rome', now())::date AS as_of_date,
  extract(year FROM timezone('Europe/Rome', now()))::int AS current_year,
  (extract(year FROM timezone('Europe/Rome', now()))::int - 1) AS latest_closed_year;

CREATE OR REPLACE VIEW public.analytics_history_meta
WITH (security_invoker = on) AS
WITH clock AS (
  SELECT * FROM public.analytics_business_clock
),
service_rows AS (
  SELECT
    timezone(clock.business_timezone, s.service_date)::date AS service_local_date,
    extract(year FROM timezone(clock.business_timezone, s.service_date))::int AS service_year
  FROM public.services s
  CROSS JOIN clock
),
bounds AS (
  SELECT
    min(service_year) FILTER (WHERE service_local_date <= clock.as_of_date) AS first_year_with_data,
    max(service_year) FILTER (WHERE service_local_date <= clock.as_of_date) AS last_year_with_data,
    bool_or(
      service_year = clock.current_year
      AND service_local_date <= clock.as_of_date
    ) AS has_current_year_data,
    bool_or(service_local_date > clock.as_of_date) AS has_future_services
  FROM service_rows
  CROSS JOIN clock
)
SELECT
  clock.id,
  clock.business_timezone,
  clock.as_of_date,
  clock.current_year,
  clock.latest_closed_year,
  bounds.first_year_with_data,
  bounds.last_year_with_data,
  CASE
    WHEN bounds.first_year_with_data IS NULL THEN 0
    ELSE clock.current_year - bounds.first_year_with_data + 1
  END AS total_years,
  COALESCE(bounds.has_current_year_data, false) AS has_current_year_data,
  COALESCE(bounds.has_future_services, false) AS has_future_services
FROM clock
CROSS JOIN bounds;

CREATE OR REPLACE VIEW public.analytics_yearly_competence_revenue
WITH (security_invoker = on) AS
WITH clock AS (
  SELECT * FROM public.analytics_business_clock
),
meta AS (
  SELECT * FROM public.analytics_history_meta
),
years AS (
  SELECT
    generate_series(meta.first_year_with_data, clock.current_year, 1)::int AS year
  FROM meta
  CROSS JOIN clock
  WHERE meta.first_year_with_data IS NOT NULL
),
aggregated AS (
  SELECT
    extract(year FROM timezone(clock.business_timezone, s.service_date))::int AS year,
    SUM(s.fee_shooting + s.fee_editing + s.fee_other - s.discount) AS revenue,
    SUM(s.km_distance) AS total_km,
    SUM(s.km_distance * s.km_rate) AS km_cost,
    COUNT(*) AS services_count,
    COUNT(DISTINCT s.project_id) AS projects_count,
    COUNT(DISTINCT p.client_id) AS clients_count
  FROM public.services s
  JOIN public.projects p ON p.id = s.project_id
  CROSS JOIN clock
  WHERE timezone(clock.business_timezone, s.service_date)::date <= clock.as_of_date
  GROUP BY 1
)
SELECT
  years.year,
  years.year < clock.current_year AS is_closed_year,
  years.year = clock.current_year AS is_ytd,
  clock.as_of_date,
  COALESCE(aggregated.revenue, 0) AS revenue,
  COALESCE(aggregated.total_km, 0) AS total_km,
  COALESCE(aggregated.km_cost, 0) AS km_cost,
  COALESCE(aggregated.services_count, 0) AS services_count,
  COALESCE(aggregated.projects_count, 0) AS projects_count,
  COALESCE(aggregated.clients_count, 0) AS clients_count
FROM years
CROSS JOIN clock
LEFT JOIN aggregated ON aggregated.year = years.year
ORDER BY years.year ASC;

CREATE OR REPLACE VIEW public.analytics_yearly_competence_revenue_by_category
WITH (security_invoker = on) AS
WITH clock AS (
  SELECT * FROM public.analytics_business_clock
),
meta AS (
  SELECT * FROM public.analytics_history_meta
),
categories AS (
  SELECT DISTINCT p.category
  FROM public.projects p
),
years AS (
  SELECT
    generate_series(meta.first_year_with_data, clock.current_year, 1)::int AS year
  FROM meta
  CROSS JOIN clock
  WHERE meta.first_year_with_data IS NOT NULL
),
grid AS (
  SELECT
    years.year,
    categories.category
  FROM years
  CROSS JOIN categories
),
aggregated AS (
  SELECT
    extract(year FROM timezone(clock.business_timezone, s.service_date))::int AS year,
    p.category,
    SUM(s.fee_shooting + s.fee_editing + s.fee_other - s.discount) AS revenue,
    COUNT(*) AS services_count,
    COUNT(DISTINCT s.project_id) AS projects_count
  FROM public.services s
  JOIN public.projects p ON p.id = s.project_id
  CROSS JOIN clock
  WHERE timezone(clock.business_timezone, s.service_date)::date <= clock.as_of_date
  GROUP BY 1, 2
)
SELECT
  grid.year,
  grid.category,
  grid.year < clock.current_year AS is_closed_year,
  grid.year = clock.current_year AS is_ytd,
  clock.as_of_date,
  COALESCE(aggregated.revenue, 0) AS revenue,
  COALESCE(aggregated.services_count, 0) AS services_count,
  COALESCE(aggregated.projects_count, 0) AS projects_count
FROM grid
CROSS JOIN clock
LEFT JOIN aggregated
  ON aggregated.year = grid.year
 AND aggregated.category = grid.category
ORDER BY grid.year ASC, grid.category ASC;

CREATE OR REPLACE VIEW public.analytics_client_lifetime_competence_revenue
WITH (security_invoker = on) AS
WITH clock AS (
  SELECT * FROM public.analytics_business_clock
)
SELECT
  c.id AS client_id,
  c.name AS client_name,
  min(timezone(clock.business_timezone, s.service_date)::date) AS first_service_date,
  max(timezone(clock.business_timezone, s.service_date)::date) AS last_service_date,
  SUM(s.fee_shooting + s.fee_editing + s.fee_other - s.discount) AS lifetime_revenue,
  COUNT(
    DISTINCT extract(year FROM timezone(clock.business_timezone, s.service_date))::int
  ) AS active_years_count,
  COUNT(DISTINCT p.id) AS projects_count,
  COUNT(*) AS services_count
FROM public.services s
JOIN public.projects p ON p.id = s.project_id
JOIN public.clients c ON c.id = p.client_id
CROSS JOIN clock
WHERE timezone(clock.business_timezone, s.service_date)::date <= clock.as_of_date
GROUP BY c.id, c.name
ORDER BY lifetime_revenue DESC, c.name ASC;
