-- =============================================================================
-- Add missing expense + payment records for 2 unfilled BTF Cantina Tre Santi
-- episodes (18/09 and 21/10) — work done but never invoiced.
--
-- 1. Two spostamento_km expense records (120 km each)
-- 2. One pending payment for total €669.60 (fees 624 + km 45.60)
-- =============================================================================

DO $$
DECLARE
  v_diego   UUID;
  v_btf     UUID;
BEGIN
  SELECT id INTO v_diego FROM clients WHERE name = 'Diego Caltabiano';
  SELECT id INTO v_btf   FROM projects WHERE name = 'Bella tra i Fornelli';

  -- 1. Km expenses for both episodes
  INSERT INTO expenses (project_id, client_id, expense_date, expense_type, km_distance, km_rate, description)
  VALUES
    (v_btf, v_diego, '2025-09-18', 'spostamento_km', 120, 0.19, 'Spostamento — Cantina Tre Santi (vendemmia)'),
    (v_btf, v_diego, '2025-10-21', 'spostamento_km', 120, 0.19, 'Spostamento — Cantina Tre Santi (puntata finale)');

  -- 2. Pending payment for total owed (fees + km, not invoiced)
  INSERT INTO payments (client_id, project_id, payment_type, amount, status, notes)
  VALUES
    (v_diego, v_btf, 'saldo', 669.60, 'in_attesa', 'Non fatturato — 2 puntate BTF Cantina Tre Santi (vendemmia + finale)');

END $$;
