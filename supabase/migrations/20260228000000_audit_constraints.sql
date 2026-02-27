-- ============================================================
-- AUDIT CONSTRAINTS — Gestionale Rosario Furnari
-- Migration: 20260228000000_audit_constraints.sql
-- Description: Adds constraints identified in audit session 14
-- Built incrementally: one issue at a time
-- ============================================================

-- B1: UNIQUE on clients.name (prevent duplicate clients)
ALTER TABLE public.clients
  ADD CONSTRAINT clients_name_unique UNIQUE (name);

-- =============================================
-- A2 + B2: Non-negative amounts + new types
-- =============================================

-- Add 'credito_ricevuto' to expense_type (for credits/barter like iPhone)
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_expense_type_check CHECK (expense_type IN (
    'spostamento_km', 'acquisto_materiale', 'noleggio', 'altro', 'credito_ricevuto'
  ));

-- Add 'rimborso' to payment_type (refund from me to client)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_type_check CHECK (payment_type IN (
    'acconto', 'saldo', 'parziale', 'rimborso_spese', 'rimborso'
  ));

-- Migrate iPhone record: negative amount → positive with credito_ricevuto type
UPDATE public.expenses
  SET amount = ABS(amount),
      expense_type = 'credito_ricevuto'
  WHERE amount < 0;

-- CHECK >= 0 on services
ALTER TABLE public.services
  ADD CONSTRAINT services_fee_shooting_non_negative CHECK (fee_shooting >= 0),
  ADD CONSTRAINT services_fee_editing_non_negative CHECK (fee_editing >= 0),
  ADD CONSTRAINT services_fee_other_non_negative CHECK (fee_other >= 0),
  ADD CONSTRAINT services_discount_non_negative CHECK (discount >= 0),
  ADD CONSTRAINT services_km_distance_non_negative CHECK (km_distance >= 0);

-- CHECK >= 0 on payments (amount always positive, type determines direction)
ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_non_negative CHECK (amount >= 0);

-- CHECK >= 0 on expenses (amount always positive, type determines direction)
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_amount_non_negative CHECK (amount IS NULL OR amount >= 0),
  ADD CONSTRAINT expenses_km_distance_non_negative CHECK (km_distance IS NULL OR km_distance >= 0),
  ADD CONSTRAINT expenses_markup_non_negative CHECK (markup_percent IS NULL OR markup_percent >= 0);

-- CHECK >= 0 on quotes
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_amount_non_negative CHECK (amount >= 0);

-- =============================================
-- Update project_financials view for refunds and credits
-- =============================================
DROP VIEW IF EXISTS public.project_financials;
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
