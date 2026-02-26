-- =============================================================================
-- Split pending payment per project + assign project_id to existing payments
--
-- Foglio 1 (fully paid €12,407.19):
--   GS S1 portion:   €6,761.59 (fees 6,229 + km 239.59 + HD 293)
--   BTF S1 portion:  €4,207.71 (fees 3,807 + km 400.71)
--   SPOT portion:    €1,437.89 (fees 1,375 + km 62.89)
--
-- Foglio 2 (partially paid, acconto €2,682.35 → balance €7,152.10):
--   GS S2 portion:   €1,360.25 (fees 1,308 + km 52.25)     → pending €989.24
--   Borghi portion:  €7,152.10 (fees 6,976 + km 416.10 - 240) → pending €5,201.36
--   BTF S2 portion:  €1,322.10 (fees 1,248 + km 74.10)     → pending €961.50
-- =============================================================================

DO $$
DECLARE
  v_diego       UUID;
  v_gs          UUID;
  v_gs_borghi   UUID;
  v_btf         UUID;
  v_pending_id  UUID;
BEGIN
  -- Get references
  SELECT id INTO v_diego FROM clients WHERE name = 'Diego Caltabiano';
  SELECT id INTO v_gs FROM projects WHERE client_id = v_diego AND name = 'Gustare Sicilia';
  SELECT id INTO v_gs_borghi FROM projects WHERE client_id = v_diego AND name LIKE 'Gustare Sicilia — Borghi%';
  SELECT id INTO v_btf FROM projects WHERE client_id = v_diego AND name = 'Bella tra i Fornelli';

  -- 1. Assign project_id to Foglio 1 payments (general — assign to main project GS)
  UPDATE payments
  SET project_id = v_gs
  WHERE client_id = v_diego
    AND notes LIKE '%foglio 1%'
    AND project_id IS NULL;

  -- 2. Assign project_id to Foglio 2 acconto
  UPDATE payments
  SET project_id = v_gs_borghi
  WHERE client_id = v_diego
    AND notes LIKE '%foglio 2%'
    AND status = 'ricevuto'
    AND project_id IS NULL;

  -- 3. Delete the single pending payment (€7,152.10)
  DELETE FROM payments
  WHERE client_id = v_diego
    AND status = 'in_attesa'
    AND amount = 7152.10;

  -- 4. Create per-project pending payments for Foglio 2
  --    Distributed proportionally: GS 13.8%, Borghi 72.7%, BTF 13.4%
  INSERT INTO payments (client_id, project_id, payment_type, amount, status, notes) VALUES
    (v_diego, v_gs,        'saldo', 989.24,  'in_attesa', 'Saldo residuo GS S2 — foglio 2'),
    (v_diego, v_gs_borghi, 'saldo', 5201.36, 'in_attesa', 'Saldo residuo Borghi Marinari — foglio 2'),
    (v_diego, v_btf,       'saldo', 961.50,  'in_attesa', 'Saldo residuo BTF S2 — foglio 2');

END $$;
