-- ============================================================
-- FASE 2 — Step 1: discount column, updated tariffs, views fix
-- Migration: 20260225230028_fase2_discount_tariffe.sql
-- ============================================================

-- 1. Add discount column to services
ALTER TABLE public.services
  ADD COLUMN discount DECIMAL(10,2) DEFAULT 0;

-- 2. Update settings: new 2025/2026 tariffs
UPDATE public.settings SET value = '233' WHERE key = 'default_fee_shooting';
UPDATE public.settings SET value = '311' WHERE key = 'default_fee_editing_standard';
UPDATE public.settings SET value = '156' WHERE key = 'default_fee_editing_short';

-- 3. Rename default_fee_editing_spot -> default_fee_spot (flat rate, not just editing)
DELETE FROM public.settings WHERE key = 'default_fee_editing_spot';
INSERT INTO public.settings (key, value) VALUES ('default_fee_spot', '312');

-- 4. Update views to account for discount
CREATE OR REPLACE VIEW public.project_financials AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  c.name AS client_name,
  p.category,
  COUNT(s.id) AS total_services,
  COALESCE(SUM(s.fee_shooting + s.fee_editing + s.fee_other - s.discount), 0) AS total_fees,
  COALESCE(SUM(s.km_distance), 0) AS total_km,
  COALESCE(SUM(s.km_distance * s.km_rate), 0) AS total_km_cost,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'ricevuto'), 0) AS total_paid,
  COALESCE(SUM(s.fee_shooting + s.fee_editing + s.fee_other - s.discount), 0) -
    COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'ricevuto'), 0) AS balance_due
FROM public.projects p
JOIN public.clients c ON p.client_id = c.id
LEFT JOIN public.services s ON s.project_id = p.id
LEFT JOIN public.payments pay ON pay.project_id = p.id
GROUP BY p.id, p.name, c.name, p.category;

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
