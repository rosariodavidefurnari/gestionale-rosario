-- Fix payment date for Nisseno: received 26/01/2026 (not 29/12/2025)

UPDATE payments
SET payment_date = '2026-01-26'
WHERE invoice_ref = 'FPR 9/25'
  AND amount = 1744;
