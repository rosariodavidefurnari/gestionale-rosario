-- =============================================================================
-- Data Import: Diego Caltabiano — services, payments, expenses
-- Source: docs/data-import-analysis.md (validated with Rosario)
--
-- Totals:
--   Foglio 1: €12,407.19 (GS 6,229 + BTF 3,807 + SPOT 1,375 + HD 293 + KM 703.19)
--   Foglio 2: €9,834.45  (GS 8,284 + BTF 1,248 + HD 260 - iPhone 500 + KM 542.45)
--   Grand total: €22,241.64
-- =============================================================================

DO $$
DECLARE
  v_diego           UUID;
  v_gs              UUID;
  v_gs_borghi       UUID;
  v_btf             UUID;
  v_spot_colate     UUID;
  v_spot_rosemary   UUID;
  v_spot_panino     UUID;
  v_spot_hclinic    UUID;
  v_spot_spritz     UUID;
  v_spot_castellaccio UUID;
BEGIN

  -- ===========================================================================
  -- 1. CLIENT (1 record)
  -- ===========================================================================
  INSERT INTO clients (name, client_type, source, notes)
  VALUES ('Diego Caltabiano', 'produzione_tv', 'passaparola',
          'Collaboratore principale per produzioni TV e spot')
  RETURNING id INTO v_diego;

  -- ===========================================================================
  -- 2. PROJECTS (9 records)
  -- ===========================================================================
  INSERT INTO projects (client_id, name, category, tv_show, status, start_date)
  VALUES (v_diego, 'Gustare Sicilia', 'produzione_tv', 'gustare_sicilia', 'in_corso', '2024-10-27')
  RETURNING id INTO v_gs;

  INSERT INTO projects (client_id, name, category, tv_show, status, start_date)
  VALUES (v_diego, 'Gustare Sicilia — Borghi Marinari', 'produzione_tv', 'gustare_sicilia', 'in_corso', '2025-06-12')
  RETURNING id INTO v_gs_borghi;

  INSERT INTO projects (client_id, name, category, tv_show, status, start_date)
  VALUES (v_diego, 'Bella tra i Fornelli', 'produzione_tv', 'bella_tra_i_fornelli', 'in_corso', '2024-12-23')
  RETURNING id INTO v_btf;

  INSERT INTO projects (client_id, name, category, status, start_date)
  VALUES (v_diego, 'Spot Colate Verdi Evo Etna', 'spot', 'completato', '2024-10-17')
  RETURNING id INTO v_spot_colate;

  INSERT INTO projects (client_id, name, category, status, start_date)
  VALUES (v_diego, 'Spot Rosemary''s Pub', 'spot', 'completato', '2024-12-28')
  RETURNING id INTO v_spot_rosemary;

  INSERT INTO projects (client_id, name, category, status, start_date)
  VALUES (v_diego, 'Spot Panino Mania', 'spot', 'completato', '2024-12-28')
  RETURNING id INTO v_spot_panino;

  INSERT INTO projects (client_id, name, category, status, start_date)
  VALUES (v_diego, 'Spot HCLINIC', 'spot', 'completato', '2025-01-08')
  RETURNING id INTO v_spot_hclinic;

  INSERT INTO projects (client_id, name, category, status, start_date)
  VALUES (v_diego, 'Spot Spritz & Co', 'spot', 'completato', '2025-01-23')
  RETURNING id INTO v_spot_spritz;

  INSERT INTO projects (client_id, name, category, status, start_date)
  VALUES (v_diego, 'Spot Il Castellaccio', 'spot', 'completato', '2025-03-04')
  RETURNING id INTO v_spot_castellaccio;

  -- ===========================================================================
  -- 3. SERVICES — Sheet 1: Gustare Sicilia (16 + 1 bonus = 17)
  -- ===========================================================================
  INSERT INTO services (project_id, service_date, service_type, fee_shooting, fee_editing, km_distance, location, notes) VALUES
  (v_gs, '2024-10-27', 'riprese_montaggio', 187, 249, 148, 'Ragalna',            'Speciale'),
  (v_gs, '2024-11-24', 'riprese_montaggio', 187, 249, 163, 'Nicolosi',           'Speciale'),
  (v_gs, '2024-12-07', 'riprese',           187,   0, 188, 'Bronte',             'Solo riprese'),
  (v_gs, '2024-12-08', 'riprese_montaggio', 187, 249, 188, 'Bronte',             NULL),
  (v_gs, '2024-12-16', 'riprese',           187,   0, 141, 'Motta S. Anastasia', 'Solo riprese'),
  (v_gs, '2024-12-17', 'riprese_montaggio', 187, 249, 141, 'Motta S. Anastasia', NULL),
  (v_gs, '2025-01-20', 'riprese',           187,   0,  84, 'Mazzarino',          'Solo riprese'),
  (v_gs, '2025-01-21', 'riprese_montaggio', 187, 249,   0, 'Mazzarino',          NULL),
  (v_gs, '2025-01-27', 'riprese',           187,   0,  65, 'Pietraperzia',       'Solo riprese'),
  (v_gs, '2025-01-28', 'riprese_montaggio', 187, 249,   0, 'Pietraperzia',       NULL),
  (v_gs, '2025-02-11', 'riprese_montaggio', 187, 249,  43, 'Aidone',             NULL),
  (v_gs, '2025-02-18', 'riprese_montaggio', 187, 249,  40, 'Piazza Armerina',    NULL),
  (v_gs, '2025-03-17', 'riprese_montaggio', 187, 249,   0, 'Gibellina',          NULL),
  (v_gs, '2025-03-23', 'riprese_montaggio', 187, 249,   0, 'Valguarnera',        NULL),
  (v_gs, '2025-03-31', 'riprese_montaggio', 187, 249,  60, 'Barrafranca',        NULL),
  (v_gs, '2025-04-07', 'riprese_montaggio', 187, 249,   0, 'Corleone',           NULL),
  -- Bonus montaggio: regalo da Diego Caltabiano
  (v_gs, '2025-04-07', 'montaggio',           0, 249,   0, NULL,                 'Bonus montaggio — regalo da Diego Caltabiano');

  -- ===========================================================================
  -- 4. SERVICES — Sheet 1: Bella tra i Fornelli (15)
  -- ===========================================================================
  INSERT INTO services (project_id, service_date, service_type, fee_shooting, fee_editing, km_distance, location, notes) VALUES
  (v_btf, '2024-12-23', 'montaggio',          0, 125, 164, 'Santocchini',              'Spot BTF — sconto, riprese e montaggio veloci'),
  (v_btf, '2024-12-29', 'montaggio',          0, 250, 103, NULL,                       'Sigla BTF — si intende riprese e montaggio'),
  (v_btf, '2025-01-05', 'riprese_montaggio', 187, 125, 164, 'Santocchini',             NULL),
  (v_btf, '2025-01-13', 'riprese_montaggio', 187, 125, 155, 'Pasticceria Vittoria',    NULL),
  (v_btf, '2025-01-23', 'riprese_montaggio', 187, 125, 163, 'Mon - Nicolosi',          NULL),
  (v_btf, '2025-01-30', 'riprese_montaggio', 187, 125, 152, 'Spritz & Co - Belpasso',  NULL),
  (v_btf, '2025-02-13', 'riprese_montaggio', 187, 125, 160, 'Acitrezza - Paninomania', NULL),
  (v_btf, '2025-02-20', 'riprese_montaggio', 187, 125, 160, 'Catania - Antica Sicilia', NULL),
  (v_btf, '2025-02-25', 'riprese',           187,   0, 160, 'Spazio Sapore',           'Solo riprese'),
  (v_btf, '2025-03-03', 'riprese',           187,   0, 160, 'Spazio Sapore',           'Solo riprese'),
  (v_btf, '2025-03-06', 'riprese',           187,   0, 210, 'Esterne - Spazio Sapore', 'Solo riprese'),
  (v_btf, '2025-03-11', 'riprese',           187,   0, 160, 'Spazio Sapore',           'Solo riprese'),
  (v_btf, '2025-03-15', 'montaggio',           0, 375,   0, NULL,                      'Montaggio 3 puntate Spazio Sapore (125 x 3) — data approssimativa'),
  (v_btf, '2025-03-25', 'montaggio',           0, 125,   0, 'U Fucularu',              'Solo montaggio'),
  (v_btf, '2025-04-04', 'riprese_montaggio', 187, 125, 198, 'La Prua - Acireale',      NULL);

  -- ===========================================================================
  -- 5. SERVICES — Sheet 1: SPOT (6)
  -- ===========================================================================
  INSERT INTO services (project_id, service_date, service_type, fee_shooting, fee_editing, fee_other, km_distance, location, notes) VALUES
  (v_spot_colate,      '2024-10-17', 'montaggio',          0, 125,   0,   0, NULL, 'Sconto — riprese/musica/voiceover gia forniti'),
  (v_spot_rosemary,    '2024-12-28', 'riprese_montaggio',  0,   0, 250, 163, NULL, 'Si intende riprese e montaggio'),
  (v_spot_panino,      '2024-12-28', 'riprese_montaggio',  0,   0, 250,   0, NULL, 'Si intende riprese e montaggio'),
  (v_spot_hclinic,     '2025-01-08', 'riprese_montaggio',  0,   0, 250, 168, NULL, 'Si intende riprese e montaggio'),
  (v_spot_spritz,      '2025-01-23', 'riprese_montaggio',  0,   0, 250,   0, NULL, NULL),
  (v_spot_castellaccio,'2025-03-04', 'riprese_montaggio',  0,   0, 250,   0, NULL, NULL);

  -- ===========================================================================
  -- 6. SERVICES — Sheet 2: Gustare Sicilia regular (3)
  -- ===========================================================================
  INSERT INTO services (project_id, service_date, service_type, fee_shooting, fee_editing, km_distance, location, notes) VALUES
  (v_gs, '2025-04-20', 'riprese_montaggio', 187, 249,  65, 'Pietraperzia', NULL),
  (v_gs, '2025-04-28', 'riprese_montaggio', 187, 249,  60, 'Ambiens',      NULL),
  (v_gs, '2025-05-29', 'riprese_montaggio', 187, 249, 150, 'Pozzallo',     NULL);

  -- ===========================================================================
  -- 7. SERVICES — Sheet 2: Gustare Sicilia Borghi Marinari (16)
  -- ===========================================================================
  INSERT INTO services (project_id, service_date, service_type, fee_shooting, fee_editing, km_distance, location, notes) VALUES
  (v_gs_borghi, '2025-06-12', 'riprese_montaggio', 187, 249, 190, '1 - Acitrezza',                NULL),
  (v_gs_borghi, '2025-06-16', 'riprese_montaggio', 187, 249, 200, '2 - Brucoli',                  NULL),
  (v_gs_borghi, '2025-06-26', 'riprese_montaggio', 187, 249,   0, '3 - Castellammare del Golfo',  NULL),
  (v_gs_borghi, '2025-07-02', 'riprese_montaggio', 187, 249, 150, '4 - Marzamemi',                NULL),
  (v_gs_borghi, '2025-07-17', 'riprese_montaggio', 187, 249, 150, '5 - Capo d''Orlando',          NULL),
  (v_gs_borghi, '2025-07-23', 'riprese_montaggio', 187, 249,   0, '6 - Selinunte',                NULL),
  (v_gs_borghi, '2025-08-04', 'riprese_montaggio', 187, 249,   0, '7 - Isola delle Femmine',      NULL),
  (v_gs_borghi, '2025-08-09', 'riprese_montaggio', 187, 249, 800, '8 - Salina',                   'Viaggio doppio 400km x2, pedaggi non conteggiati'),
  (v_gs_borghi, '2025-08-12', 'riprese_montaggio', 187, 249,   0, '9 - Custonaci',                NULL),
  (v_gs_borghi, '2025-08-21', 'riprese_montaggio', 187, 249,   0, '10 - Sferracavallo',           NULL),
  (v_gs_borghi, '2025-08-31', 'riprese_montaggio', 187, 249, 150, '11 - Pozzallo',                NULL),
  (v_gs_borghi, '2025-09-03', 'riprese_montaggio', 187, 249,   0, '12 - Santa Flavia',            NULL),
  (v_gs_borghi, '2025-09-16', 'riprese_montaggio', 187, 249, 150, '13 - Catania',                 NULL),
  (v_gs_borghi, '2025-09-25', 'riprese_montaggio', 187, 249, 400, '14 - Lipari',                  NULL),
  (v_gs_borghi, '2025-09-30', 'riprese_montaggio', 187, 249,   0, '15 - Favignana',               NULL),
  (v_gs_borghi, '2025-10-06', 'riprese_montaggio', 187, 249,   0, '16 - Sciacca',                 NULL);

  -- ===========================================================================
  -- 8. SERVICES — Sheet 2: Bella tra i Fornelli (5 with amounts + 2 placeholders)
  -- ===========================================================================
  INSERT INTO services (project_id, service_date, service_type, fee_shooting, fee_editing, km_distance, location, notes) VALUES
  (v_btf, '2025-05-20', 'riprese',           187,   0, 120, 'Cantina Tre Santi',  'Solo riprese'),
  (v_btf, '2025-05-27', 'riprese',           187,   0, 120, 'Cantina Tre Santi',  'Solo riprese'),
  (v_btf, '2025-05-28', 'riprese',           187,   0,   0, 'Cantina Tre Santi',  'Solo riprese'),
  (v_btf, '2025-06-01', 'montaggio',           0, 500,   0, 'Cantina Tre Santi',  'Montaggio 4 puntate (125 x 4) — data approssimativa'),
  (v_btf, '2025-06-05', 'riprese',           187,   0, 150, 'Spazio Sapore',      'Solo riprese — montaggio gia saldato'),
  -- Placeholders: dates only, no amounts (user will update manually)
  (v_btf, '2025-09-18', 'riprese_montaggio',   0,   0,   0, 'Cantina Tre Santi',  'Da completare — solo data registrata'),
  (v_btf, '2025-10-21', 'riprese_montaggio',   0,   0,   0, 'Cantina Tre Santi',  'Da completare — solo data registrata');

  -- ===========================================================================
  -- 9. PAYMENTS (7 records)
  -- ===========================================================================
  INSERT INTO payments (client_id, payment_date, payment_type, amount, method, status, notes) VALUES
  (v_diego, '2024-12-27', 'acconto',  999.00, 'bonifico', 'ricevuto', 'Acconto foglio 1'),
  (v_diego, '2025-02-10', 'acconto', 2000.00, 'bonifico', 'ricevuto', 'Acconto foglio 1'),
  (v_diego, '2025-03-03', 'acconto', 3113.00, 'bonifico', 'ricevuto', 'Acconto foglio 1'),
  (v_diego, '2025-04-22', 'acconto', 2500.00, 'bonifico', 'ricevuto', 'Acconto foglio 1'),
  (v_diego, '2025-04-30', 'acconto', 2000.00, 'bonifico', 'ricevuto', 'Acconto foglio 1'),
  (v_diego, '2025-05-14', 'saldo',   1795.19, 'bonifico', 'ricevuto', 'Saldo finale foglio 1'),
  (v_diego, '2025-10-14', 'acconto', 2682.35, 'bonifico', 'ricevuto', 'Acconto foglio 2');

  -- ===========================================================================
  -- 10. EXPENSES (3 records)
  -- ===========================================================================
  INSERT INTO expenses (project_id, client_id, expense_date, expense_type, amount, markup_percent, description) VALUES
  (v_gs,        v_diego, '2025-04-07', 'acquisto_materiale', 234.40, 25, 'Hard Disk Seagate IronWolf Pro 8TB'),
  (v_gs_borghi, v_diego, '2025-10-06', 'acquisto_materiale', 260.00,  0, 'Hard Disk'),
  (v_gs_borghi, v_diego, '2025-10-06', 'altro',            -500.00,  0, 'Vendita iPhone — sconto applicato sul totale');

END $$;
