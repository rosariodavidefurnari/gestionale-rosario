-- =============================================================================
-- Import: Gustare Sicilia — Nisseno (4 puntate)
-- Source: Fattura FPR 9/25 del 29/12/2025
--   4 puntate: Riesi, Mazzarino, Butera, Sommatino
--   Totale: €1,744.00 (€436 per puntata)
--   Pagamento: ricevuto (FPR 9/25)
-- =============================================================================

DO $$
DECLARE
  v_diego   UUID;
  v_nisseno UUID;
BEGIN
  SELECT id INTO v_diego FROM clients WHERE name = 'Diego Caltabiano';

  -- 1. PROJECT
  INSERT INTO projects (client_id, name, category, tv_show, status, start_date)
  VALUES (v_diego, 'Gustare Sicilia — Nisseno', 'produzione_tv', 'gustare_sicilia', 'completato', '2025-12-01')
  RETURNING id INTO v_nisseno;

  -- 2. SERVICES (4 puntate, €436 each — flat rate, no km in invoice)
  INSERT INTO services (project_id, service_date, service_type, location, fee_shooting, fee_editing, fee_other, discount, km_distance, km_rate) VALUES
  (v_nisseno, '2025-12-01', 'riprese_montaggio', 'Riesi',       0, 0, 436, 0, 0, 0.19),
  (v_nisseno, '2025-12-08', 'riprese_montaggio', 'Mazzarino',   0, 0, 436, 0, 0, 0.19),
  (v_nisseno, '2025-12-15', 'riprese_montaggio', 'Butera',      0, 0, 436, 0, 0, 0.19),
  (v_nisseno, '2025-12-22', 'riprese_montaggio', 'Sommatino',   0, 0, 436, 0, 0, 0.19);

  -- 3. PAYMENT (ricevuto, FPR 9/25)
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, status, invoice_ref, notes)
  VALUES (v_diego, v_nisseno, '2025-12-29', 'saldo', 1744, 'bonifico', 'ricevuto', 'FPR 9/25', 'Saldo 4 puntate Nisseno');

END $$;
