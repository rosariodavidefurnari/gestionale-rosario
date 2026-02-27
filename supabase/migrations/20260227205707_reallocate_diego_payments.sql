-- =============================================================================
-- Reallocate ALL Diego Caltabiano payments based on fogli contabili.
--
-- Problem: All Foglio 1 payments (€12,407.19) were assigned to "Gustare Sicilia"
-- but actually covered GS + BTF + 6 Spots. Foglio 2 payments were also misallocated.
--
-- Source of truth: CSV fogli "Servizi per Diego Caltabiano — DAL 27 10 24 AL 07 04 25"
-- Cross-referenced with fatture XML (FPR 7/24, FPR 1/25, FPR 2/25, FPR 4/25, FPR 6/25).
--
-- DELETE 10 erroneous records, CREATE 11 correctly allocated records.
-- Total ricevuto stays exactly €23,985.64 (net zero change).
-- =============================================================================

DO $$
DECLARE
  v_client_id UUID := '4a01f81c-8517-47e3-830b-94caf2031bd1'; -- Diego Caltabiano
  -- Project IDs
  v_gs         UUID := '01431bf8-dc7a-40c8-9e38-1593c45a6342'; -- Gustare Sicilia
  v_btf        UUID := 'ec227292-cbc4-4478-a4d2-e041dbe37a01'; -- Bella tra i Fornelli
  v_bm         UUID := '6d9f6b8d-9744-4178-9be1-914d1a319a02'; -- GS Borghi Marinari
  v_colate     UUID := '20e50f26-1c31-491a-a399-a333353a4691'; -- Spot Colate Verdi Evo Etna
  v_rosemary   UUID := '262cbdca-fec2-4b03-b85d-c9a3dde74166'; -- Spot Rosemary's Pub
  v_panino     UUID := '316efba7-f430-4281-90cd-c944406a9aa7'; -- Spot Panino Mania
  v_hclinic    UUID := '6ff8c9d6-e385-40d9-9e1b-84e8a3e0d204'; -- Spot HCLINIC
  v_spritz     UUID := '3ffad994-4446-4bce-9bdf-c318b3baf128'; -- Spot Spritz & Co
  v_castellac  UUID := '4425ce7a-1f48-47ab-8ac6-b63082080881'; -- Spot Il Castellaccio
BEGIN

  -- =========================================================================
  -- STEP 1: Delete 10 misallocated payment records
  -- =========================================================================

  -- Foglio 1: 6 payments all wrongly assigned to GS (total €12,407.19)
  DELETE FROM payments WHERE id IN (
    'cd98162d-7352-4127-931b-dba549b3ee82',  -- €999.00,   Dec 27, no ref
    'e4737fe3-48cb-4d3b-96c3-3ef0921b1357',  -- €2,000.00, Feb 10, FPR 1/25
    'f6d90a90-ca60-482a-b356-68dd471e7fd4',  -- €3,113.00, Mar 3,  FPR 1/25
    '5db23c34-a2de-4163-af70-0900748e9917',  -- €2,500.00, Apr 22, FPR 2/25
    'c7296662-a780-4a33-88bc-04031c7ec8f3',  -- €2,000.00, Apr 30, FPR 2/25
    '4d39930e-3d72-44b4-b231-6424924d2994'   -- €1,795.19, May 14, FPR 2/25
  );

  -- Foglio 2: 4 payments with wrong project allocations (total €9,834.45)
  DELETE FROM payments WHERE id IN (
    'bc633549-d732-4dee-82a4-fefb352ac8f1',  -- €2,682.35, FPR 4/25 (was BM, should be GS+BTF)
    '93b71c8e-b4c7-485a-9c78-d6d9523bedc0',  -- €989.24,   FPR 6/25 (was GS, should be BM)
    '85f7a3b5-c3e9-4a17-a784-cf0210f41ced',  -- €5,201.36, FPR 6/25 (was BM)
    '5337fd24-056d-4607-9128-d3adcc2659fb'   -- €961.50,   FPR 6/25 (was BTF, should be BM)
  );

  -- =========================================================================
  -- STEP 2: Create 11 correctly allocated payments
  -- =========================================================================

  -- --- FOGLIO 1: 8 records totaling €12,407.19 ---

  -- GS: servizi €6,229 + km 1261*0.19=€239.59 + HD €293 = €6,761.59
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_gs, '2025-05-14', 'saldo', 6761.59, 'bonifico', 'FPR 2/25',
          'ricevuto', 'Saldo foglio 1 (GS servizi + km + HD)');

  -- BTF: servizi €3,807 + km 2109*0.19=€400.71 = €4,207.71
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_btf, '2025-05-14', 'saldo', 4207.71, 'bonifico', 'FPR 2/25',
          'ricevuto', 'Saldo foglio 1 (BTF servizi + km)');

  -- Spot Colate Verdi: €125 (0 km)
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_colate, '2025-05-14', 'saldo', 125.00, 'bonifico', 'FPR 2/25',
          'ricevuto', 'Saldo foglio 1');

  -- Spot Rosemary Pub: €250 + km 163*0.19=€30.97 = €280.97
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_rosemary, '2025-05-14', 'saldo', 280.97, 'bonifico', 'FPR 2/25',
          'ricevuto', 'Saldo foglio 1 (servizi + km)');

  -- Spot Panino Mania: €250 (0 km)
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_panino, '2025-05-14', 'saldo', 250.00, 'bonifico', 'FPR 2/25',
          'ricevuto', 'Saldo foglio 1');

  -- Spot HCLINIC: €250 + km 168*0.19=€31.92 = €281.92
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_hclinic, '2025-05-14', 'saldo', 281.92, 'bonifico', 'FPR 2/25',
          'ricevuto', 'Saldo foglio 1 (servizi + km)');

  -- Spot Spritz & Co: €250 (0 km)
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_spritz, '2025-05-14', 'saldo', 250.00, 'bonifico', 'FPR 2/25',
          'ricevuto', 'Saldo foglio 1');

  -- Spot Il Castellaccio: €250 (0 km)
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_castellac, '2025-05-14', 'saldo', 250.00, 'bonifico', 'FPR 2/25',
          'ricevuto', 'Saldo foglio 1');

  -- --- FOGLIO 2: 3 records totaling €9,834.45 ---

  -- GS (FPR 4/25 share): 3 puntate €1,308 + km 275*0.19=€52.25 = €1,360.25
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_gs, '2025-10-14', 'acconto', 1360.25, 'bonifico', 'FPR 4/25',
          'ricevuto', 'Acconto foglio 2 (3 puntate + km)');

  -- BTF (FPR 4/25 share): Cantina+Spazio €1,248 + km 390*0.19=€74.10 = €1,322.10
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_btf, '2025-10-14', 'acconto', 1322.10, 'bonifico', 'FPR 4/25',
          'ricevuto', 'Acconto foglio 2 (Cantina+Spazio + km)');

  -- GS Borghi Marinari (FPR 6/25): 16 puntate €6,976 + km €416.10 + HD €260 - iPhone €500 = €7,152.10
  INSERT INTO payments (client_id, project_id, payment_date, payment_type, amount, method, invoice_ref, status, notes)
  VALUES (v_client_id, v_bm, '2025-11-10', 'saldo', 7152.10, 'bonifico', 'FPR 6/25',
          'ricevuto', 'Saldo Borghi Marinari (16 puntate + km + HD - iPhone)');

END $$;
