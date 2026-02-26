-- =============================================================================
-- Fix payment_type: acconto → saldo for payments that complete their invoice
--
--   €3,113 (03/03/2025) FPR 1/25: was "acconto" but completes the invoice
--   €2,682.35 (14/10/2025) FPR 4/25: was "acconto" but is the only payment
-- =============================================================================

DO $$
DECLARE
  v_diego UUID;
BEGIN
  SELECT id INTO v_diego FROM clients WHERE name = 'Diego Caltabiano';

  -- €3,113 completes FPR 1/25 (€2,000 + €3,113 = €5,113)
  UPDATE payments
  SET payment_type = 'saldo'
  WHERE client_id = v_diego
    AND payment_date = '2025-03-03'
    AND amount = 3113;

  -- €2,682.35 is the full and only payment for FPR 4/25
  UPDATE payments
  SET payment_type = 'saldo'
  WHERE client_id = v_diego
    AND payment_date = '2025-10-14'
    AND amount = 2682.35;

END $$;
