-- =============================================================================
-- Fix: assign FPR 6/25 to 2 payments that are missing invoice_ref
--
-- Affected payments (both received 10/11/2025):
--   €989.24  — Saldo residuo GS S2 — foglio 2
--   €5,201.36 — Saldo residuo Borghi Marinari — foglio 2
--
-- The BTF S2 (€961.50) already has FPR 6/25 correctly assigned.
-- =============================================================================

UPDATE payments
SET invoice_ref = 'FPR 6/25'
WHERE invoice_ref IS NULL
  AND payment_date = '2025-11-10'
  AND status = 'ricevuto'
  AND amount IN (989.24, 5201.36);
