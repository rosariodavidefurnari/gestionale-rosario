-- =============================================================================
-- Assign invoice_ref to Diego Caltabiano payments + mark pending as received
--
-- Invoices (from Fatture/ folder):
--   FPR 1/25 (01/02/2025) — €5,113.00: GS + BTF first batch
--   FPR 2/25 (11/04/2025) — €6,295.00: GS + BTF (11/02 - 07/04)
--   FPR 4/25 (12/10/2025) — €2,682.35: GS + BTF (20/04 - 05/06) acconto
--   FPR 6/25 (04/11/2025) — €7,152.00: 16 puntate Borghi Marinari
--
-- Payment → Invoice mapping:
--   €999    (27/12/2024) — no invoice (pre-invoice acconto)
--   €2,000  (10/02/2025) — FPR 1/25
--   €3,113  (03/03/2025) — FPR 1/25
--   €2,500  (22/04/2025) — FPR 2/25
--   €2,000  (30/04/2025) — FPR 2/25
--   €1,795.19 (14/05/2025) — FPR 2/25
--   €2,682.35 (14/10/2025) — FPR 4/25
--
-- All 3 pending payments received 10/11/2025 in single bank transfer (FPR 6/25):
--   GS S2 €989.24 + Borghi €5,201.36 + BTF S2 €961.50 = €7,152.10
-- =============================================================================

DO $$
DECLARE
  v_diego UUID;
BEGIN
  SELECT id INTO v_diego FROM clients WHERE name = 'Diego Caltabiano';

  -- FPR 1/25: payments on 10/02/2025 and 03/03/2025
  UPDATE payments
  SET invoice_ref = 'FPR 1/25'
  WHERE client_id = v_diego
    AND payment_date = '2025-02-10'
    AND amount = 2000;

  UPDATE payments
  SET invoice_ref = 'FPR 1/25'
  WHERE client_id = v_diego
    AND payment_date = '2025-03-03'
    AND amount = 3113;

  -- FPR 2/25: payments on 22/04, 30/04, 14/05
  UPDATE payments
  SET invoice_ref = 'FPR 2/25'
  WHERE client_id = v_diego
    AND payment_date = '2025-04-22'
    AND amount = 2500;

  UPDATE payments
  SET invoice_ref = 'FPR 2/25'
  WHERE client_id = v_diego
    AND payment_date = '2025-04-30'
    AND amount = 2000;

  UPDATE payments
  SET invoice_ref = 'FPR 2/25'
  WHERE client_id = v_diego
    AND payment_date = '2025-05-14'
    AND amount = 1795.19;

  -- FPR 4/25: acconto foglio 2
  UPDATE payments
  SET invoice_ref = 'FPR 4/25'
  WHERE client_id = v_diego
    AND payment_date = '2025-10-14'
    AND amount = 2682.35;

  -- FPR 6/25: all 3 pending payments → received 10/11/2025
  UPDATE payments
  SET invoice_ref = 'FPR 6/25',
      status = 'ricevuto',
      payment_date = '2025-11-10',
      method = 'bonifico'
  WHERE client_id = v_diego
    AND status = 'in_attesa';

END $$;
