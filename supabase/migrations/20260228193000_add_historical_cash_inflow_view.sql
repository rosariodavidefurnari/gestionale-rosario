CREATE OR REPLACE VIEW public.analytics_yearly_cash_inflow
WITH (security_invoker = on) AS
WITH clock AS (
  SELECT * FROM public.analytics_business_clock
),
payment_rows AS (
  SELECT
    timezone(clock.business_timezone, p.payment_date)::date AS payment_local_date,
    extract(year FROM timezone(clock.business_timezone, p.payment_date))::int AS year,
    p.amount,
    p.project_id,
    p.client_id
  FROM public.payments p
  CROSS JOIN clock
  WHERE p.payment_date IS NOT NULL
    AND timezone(clock.business_timezone, p.payment_date)::date <= clock.as_of_date
    AND p.status = 'ricevuto'
    AND p.payment_type <> 'rimborso'
),
bounds AS (
  SELECT min(payment_rows.year) AS first_year_with_payments
  FROM payment_rows
),
years AS (
  SELECT
    generate_series(bounds.first_year_with_payments, clock.current_year, 1)::int AS year
  FROM bounds
  CROSS JOIN clock
  WHERE bounds.first_year_with_payments IS NOT NULL
)
, aggregated AS (
  SELECT
    payment_rows.year,
    SUM(payment_rows.amount) AS cash_inflow,
    COUNT(*) AS payments_count,
    COUNT(DISTINCT payment_rows.project_id) FILTER (
      WHERE payment_rows.project_id IS NOT NULL
    ) AS projects_count,
    COUNT(DISTINCT payment_rows.client_id) AS clients_count
  FROM payment_rows
  GROUP BY payment_rows.year
)
SELECT
  years.year,
  years.year < clock.current_year AS is_closed_year,
  years.year = clock.current_year AS is_ytd,
  clock.as_of_date,
  COALESCE(aggregated.cash_inflow, 0) AS cash_inflow,
  COALESCE(aggregated.payments_count, 0) AS payments_count,
  COALESCE(aggregated.projects_count, 0) AS projects_count,
  COALESCE(aggregated.clients_count, 0) AS clients_count
FROM years
CROSS JOIN clock
LEFT JOIN aggregated ON aggregated.year = years.year
ORDER BY years.year ASC;
