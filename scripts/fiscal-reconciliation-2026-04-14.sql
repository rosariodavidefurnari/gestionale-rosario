-- =====================================================================
-- Fiscal data reconciliation against real AdE F24 quietanze — 2026-04-14
-- =====================================================================
--
-- Context:
-- Rosario downloaded the full set of F24 quietanze from Agenzia delle
-- Entrate (cassetto fiscale) for years 2023-2026. The gestionale's
-- fiscal_obligations + fiscal_f24_payment_lines were out of sync with
-- reality in several ways:
--
--   1. Account smoke-test (93e2a0a2-…) had leaked 13 obligations,
--      9 submissions and 13 payment_lines into production. ALREADY CLEANED
--      in session 2026-04-14.
--
--   2. The three installment F24 (2024-07-31 / 2024-08-20 / 2024-09-16)
--      had non-uniform INPS amounts (751.03/748.30 instead of 749.67 ×3,
--      298.99/297.14 instead of 298.07 ×3). ALREADY CORRECTED.
--
--   3. Interest lines 1668 (erario) and DPPI (INPS) were missing from
--      the rata F24 (2024-08-20 and 2024-09-16). ALREADY ADDED.
--
--   4. The F24 2025-07-21 (saldo 2024 + acconto 1 2025) had 4 "stima"
--      obligations with wrong values (289.01 / 1515.12 / 144.51 / 602.41)
--      while the real AdE values are 0/1879/116.50/751.55 with a
--      compensation_credit of 196 euro from excess 2024 sostitutiva
--      advances. THIS SCRIPT FIXES IT.
--
--   5. The F24 2025-12-01 "grande" (acconto 2 2025) had 2 "stima"
--      obligations with wrong values (167.94 / 700.10) while the real
--      AdE values are 116.50 / 751.54. THIS SCRIPT FIXES IT.
--
--   6. fiscal_declarations 2024 had estimated totals
--      (total_substitute_tax=601.46, total_inps=2817.63) that are wrong.
--      Real totals are 233.00 and 3667.40. THIS SCRIPT FIXES IT.
--
-- Schema prerequisites (already applied):
--   - Migration 20260414211500_fiscal_interests_and_compensation.sql
--     extends component CHECK and adds compensation_credit column.
--
-- Idempotency:
--   - Uses fixed UUIDs for new obligations (c0000001-…-0000000000XX).
--   - DELETE + INSERT pattern for payment_lines (the old obligation IDs
--     are also added to the DELETE set so re-running the script is a no-op
--     on subsequent runs).
--   - ON CONFLICT (id) DO UPDATE for obligations.
--   - Plain UPDATE for declarations/submissions (naturally idempotent).
--
-- How to run:
--   Via Supabase MCP (recommended):
--     mcp__claude_ai_Supabase__execute_sql \
--       --project_id qvdmzhyzpyaveniirsmo \
--       --query "$(cat scripts/fiscal-reconciliation-2026-04-14.sql)"
--
--   Via psql (if you have service-role DATABASE_URL):
--     psql "$DATABASE_URL" -f scripts/fiscal-reconciliation-2026-04-14.sql
--
--   The final SELECT prints a verification table with expected vs actual
--   net saldo delega per submission. All rows must show status = 'OK'.
--
-- Rollback:
--   A backup snapshot of the 4 fiscal_* tables was taken on 2026-04-14
--   into tables fiscal_*_backup_20260414. To restore:
--     TRUNCATE fiscal_f24_payment_lines, fiscal_f24_submissions,
--              fiscal_obligations, fiscal_declarations CASCADE;
--     INSERT INTO fiscal_declarations
--       SELECT * FROM fiscal_declarations_backup_20260414;
--     INSERT INTO fiscal_obligations
--       SELECT * FROM fiscal_obligations_backup_20260414;
--     INSERT INTO fiscal_f24_submissions
--       SELECT * FROM fiscal_f24_submissions_backup_20260414;
--     INSERT INTO fiscal_f24_payment_lines
--       SELECT * FROM fiscal_f24_payment_lines_backup_20260414;
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- STEP B3: Rewrite 2025-07-21 F24 (saldo 2024 + acconto 1 2025)
-- ---------------------------------------------------------------------

-- 1) Delete payment_lines that reference any old stima obligation OR any
--    new target obligation id (so the script is safe to re-run).
DELETE FROM fiscal_f24_payment_lines
WHERE obligation_id IN (
  'a6675326-ba86-4476-9274-42c5d20ed037',  -- old imposta_saldo 2024 stima
  'd1c1ccf0-c28a-4b5f-aa2d-129e9309f26b',  -- old inps_saldo 2024 stima
  '5e9c9223-c0aa-4dbe-9161-f8ce462e619f',  -- old imposta_acconto_1 2025 stima
  'a07bcf75-9d2c-44c6-8028-375e798a057f',  -- old inps_acconto_1 2025 stima
  '4b8a2045-e0ec-477b-894e-a49da3f89882',  -- old imposta_acconto_2 2025 stima
  '73c9c373-d61d-4433-9a56-7a96dcacdd52',  -- old inps_acconto_2 2025 stima
  'c0000001-0000-0000-0000-000000000001',  -- new imposta_saldo 2024
  'c0000001-0000-0000-0000-000000000002',  -- new imposta_acconto_1 2025
  'c0000001-0000-0000-0000-000000000003',  -- new inps_saldo 2024
  'c0000001-0000-0000-0000-000000000004',  -- new inps_acconto_1 2025
  'c0000001-0000-0000-0000-000000000005',  -- new imposta_acconto_2 2025
  'c0000001-0000-0000-0000-000000000006'   -- new inps_acconto_2 2025
);

-- 2) Delete the old stima obligations now that no payment_lines point to them.
DELETE FROM fiscal_obligations WHERE id IN (
  'a6675326-ba86-4476-9274-42c5d20ed037',
  'd1c1ccf0-c28a-4b5f-aa2d-129e9309f26b',
  '5e9c9223-c0aa-4dbe-9161-f8ce462e619f',
  'a07bcf75-9d2c-44c6-8028-375e798a057f',
  '4b8a2045-e0ec-477b-894e-a49da3f89882',
  '73c9c373-d61d-4433-9a56-7a96dcacdd52'
);

-- 3) Upsert the 6 new obligations with real AdE F24 values.
--    All linked to declarations 1629c871 (2024) or 1866a256 (2025).
INSERT INTO fiscal_obligations (
  id, declaration_id, source, component,
  competence_year, payment_year, due_date, amount, notes, user_id
) VALUES
  -- Saldo sostitutiva 2024 (compensated via excess 2024 advances; NO payment_line)
  (
    'c0000001-0000-0000-0000-000000000001',
    '1629c871-21f8-43c3-9c30-47f8e7b15a90',
    'manual',
    'imposta_saldo',
    2024,
    2025,
    '2025-06-30',
    233.00,
    'Saldo sostitutiva 2024 (233 euro). Compensato da eccesso acconti 2024 (429 versati > 233 dovuti). Credito residuo 196 euro compensato contro saldo INPS sul F24 21/07/2025 (vedi fiscal_f24_submissions.compensation_credit). NESSUN payment_line: il saldo non e'' stato pagato su alcuna delega F24.',
    'e877676d-7b9b-434e-af1e-c786c10ddc10'
  ),
  -- Acconto 1 sostitutiva 2025 (cod. 1790) — REAL value 116.50
  (
    'c0000001-0000-0000-0000-000000000002',
    '1629c871-21f8-43c3-9c30-47f8e7b15a90',
    'manual',
    'imposta_acconto_1',
    2025,
    2025,
    '2025-06-30',
    116.50,
    'Acconto 1 sostitutiva 2025 (cod. tributo 1790). Fonte: F24 AdE 21/07/2025 quietanza. Importo reale 116,50 (era stimato 144,51).',
    'e877676d-7b9b-434e-af1e-c786c10ddc10'
  ),
  -- Saldo INPS 2024 (cod. PXX) — REAL value 1879.00
  (
    'c0000001-0000-0000-0000-000000000003',
    '1629c871-21f8-43c3-9c30-47f8e7b15a90',
    'manual',
    'inps_saldo',
    2024,
    2025,
    '2025-06-30',
    1879.00,
    'Saldo INPS Gestione Separata 2024 (cod. tributo PXX). Fonte: F24 AdE 21/07/2025 quietanza. Importo reale 1879 (era stimato 1515,12).',
    'e877676d-7b9b-434e-af1e-c786c10ddc10'
  ),
  -- Acconto 1 INPS 2025 (cod. PXX) — REAL value 751.55
  (
    'c0000001-0000-0000-0000-000000000004',
    '1629c871-21f8-43c3-9c30-47f8e7b15a90',
    'manual',
    'inps_acconto_1',
    2025,
    2025,
    '2025-06-30',
    751.55,
    'Acconto 1 INPS Gestione Separata 2025 (cod. tributo PXX). Fonte: F24 AdE 21/07/2025 quietanza. Importo reale 751,55 (era stimato 602,41).',
    'e877676d-7b9b-434e-af1e-c786c10ddc10'
  ),
  -- Acconto 2 sostitutiva 2025 (cod. 1791) — REAL value 116.50
  (
    'c0000001-0000-0000-0000-000000000005',
    '1866a256-3102-45ee-a512-b70a9560fed5',
    'manual',
    'imposta_acconto_2',
    2025,
    2025,
    '2025-11-30',
    116.50,
    'Acconto 2 sostitutiva 2025 (cod. tributo 1791). Fonte: F24 AdE 01/12/2025 quietanza. Importo reale 116,50 (era stimato 167,94).',
    'e877676d-7b9b-434e-af1e-c786c10ddc10'
  ),
  -- Acconto 2 INPS 2025 (cod. PXX) — REAL value 751.54
  (
    'c0000001-0000-0000-0000-000000000006',
    '1866a256-3102-45ee-a512-b70a9560fed5',
    'manual',
    'inps_acconto_2',
    2025,
    2025,
    '2025-11-30',
    751.54,
    'Acconto 2 INPS Gestione Separata 2025 (cod. tributo PXX). Fonte: F24 AdE 01/12/2025 quietanza. Importo reale 751,54 (era stimato 700,10).',
    'e877676d-7b9b-434e-af1e-c786c10ddc10'
  )
ON CONFLICT (id) DO UPDATE SET
  declaration_id  = EXCLUDED.declaration_id,
  source          = EXCLUDED.source,
  component       = EXCLUDED.component,
  competence_year = EXCLUDED.competence_year,
  payment_year    = EXCLUDED.payment_year,
  due_date        = EXCLUDED.due_date,
  amount          = EXCLUDED.amount,
  notes           = EXCLUDED.notes,
  updated_at      = now();

-- 4) Insert payment_lines for F24 2025-07-21 (submission a23bd6d9-…).
--    NOTE: imposta_saldo 2024 has NO payment_line — compensated via credit.
--    Net saldo delega = 116.50 + 1879 + 751.55 - 196 (compensation) = 2551.05.
INSERT INTO fiscal_f24_payment_lines (
  id, submission_id, obligation_id, amount, user_id
) VALUES
  (gen_random_uuid(), 'a23bd6d9-f12c-4ec9-bd1e-372bfcda765d',
   'c0000001-0000-0000-0000-000000000002', 116.50,
   'e877676d-7b9b-434e-af1e-c786c10ddc10'),
  (gen_random_uuid(), 'a23bd6d9-f12c-4ec9-bd1e-372bfcda765d',
   'c0000001-0000-0000-0000-000000000003', 1879.00,
   'e877676d-7b9b-434e-af1e-c786c10ddc10'),
  (gen_random_uuid(), 'a23bd6d9-f12c-4ec9-bd1e-372bfcda765d',
   'c0000001-0000-0000-0000-000000000004', 751.55,
   'e877676d-7b9b-434e-af1e-c786c10ddc10');

-- 5) Set compensation_credit on the 2025-07-21 submission.
--    Idempotent: UPDATE is the same on every run.
--    The notes are rewritten (not appended) to avoid drift on re-runs.
UPDATE fiscal_f24_submissions
SET compensation_credit = 196.00,
    notes = 'F24 da chat Fabio Capizzi del 11/07/2025 — saldo delega 2551,05. Riconciliato 2026-04-14 contro F24 AdE: imposta_acconto_1 116,50 + inps_saldo 1879 + inps_acconto_1 751,55 - compensation_credit 196 (credito sostitutiva 2024 da eccesso acconti) = 2551,05. Saldo sostitutiva 2024 (233) compensato, nessun payment_line.'
WHERE id = 'a23bd6d9-f12c-4ec9-bd1e-372bfcda765d';

-- ---------------------------------------------------------------------
-- STEP B5: Rewrite 2025-12-01 F24 grande (acconto 2 2025)
-- ---------------------------------------------------------------------

-- Insert payment_lines on the grande submission (35339751-…).
-- The bollo submission (0f1d5277-…) is left untouched — already correct at 14 euro.
INSERT INTO fiscal_f24_payment_lines (
  id, submission_id, obligation_id, amount, user_id
) VALUES
  (gen_random_uuid(), '35339751-a959-4ad5-b876-f44f10a06e74',
   'c0000001-0000-0000-0000-000000000005', 116.50,
   'e877676d-7b9b-434e-af1e-c786c10ddc10'),
  (gen_random_uuid(), '35339751-a959-4ad5-b876-f44f10a06e74',
   'c0000001-0000-0000-0000-000000000006', 751.54,
   'e877676d-7b9b-434e-af1e-c786c10ddc10');

UPDATE fiscal_f24_submissions
SET notes = 'F24 da chat Fabio Capizzi del 24/11/2025 — saldo delega 868,04 acconto IRPEF. Riconciliato 2026-04-14 contro F24 AdE: imposta_acconto_2 116,50 + inps_acconto_2 751,54 = 868,04.'
WHERE id = '35339751-a959-4ad5-b876-f44f10a06e74';

-- ---------------------------------------------------------------------
-- STEP B6: Update fiscal_declarations 2024 with real totals
-- ---------------------------------------------------------------------

UPDATE fiscal_declarations
SET total_substitute_tax = 233.00,
    total_inps = 3667.40,
    notes = 'Dichiarazione Redditi PF 2025 (periodo 2024). Totali riconciliati 2026-04-14 contro F24 AdE: sostitutiva 233 euro (era stimato 601,46), INPS 3667,40 euro = 1788,40 acconti gia'' versati + 1879 saldo pagato 21/07/2025 (era stimato 2817,63). Acconti 2024 versati: 429 euro sostitutiva, 1788,40 euro INPS. Credito residuo sostitutiva 2024: 196 euro, compensato sul F24 21/07/2025 contro INPS.',
    updated_at = now()
WHERE id = '1629c871-21f8-43c3-9c30-47f8e7b15a90';

-- =====================================================================
-- VERIFICATION: sum(payment_lines) - compensation_credit per submission
--               must match the real saldo delega from AdE quietanze.
-- =====================================================================

SELECT
  s.submission_date,
  ROUND(SUM(pl.amount)::numeric, 2) AS sum_lines,
  s.compensation_credit,
  ROUND((SUM(pl.amount) - s.compensation_credit)::numeric, 2) AS net_delega,
  CASE
    WHEN s.submission_date = '2023-11-30' AND SUM(pl.amount) - s.compensation_credit = 10.00 THEN 'OK'
    WHEN s.submission_date = '2024-02-29' AND SUM(pl.amount) - s.compensation_credit = 12.00 THEN 'OK'
    WHEN s.submission_date = '2024-07-31' AND SUM(pl.amount) - s.compensation_credit = 1262.24 THEN 'OK'
    WHEN s.submission_date = '2024-08-20' AND SUM(pl.amount) - s.compensation_credit = 1264.52 THEN 'OK'
    WHEN s.submission_date = '2024-09-16' AND SUM(pl.amount) - s.compensation_credit = 1268.67 THEN 'OK'
    WHEN s.submission_date = '2024-12-02' AND SUM(pl.amount) - s.compensation_credit IN (1108.70, 12.00) THEN 'OK'
    WHEN s.submission_date = '2025-02-28' AND SUM(pl.amount) - s.compensation_credit = 2.00 THEN 'OK'
    WHEN s.submission_date = '2025-07-21' AND SUM(pl.amount) - s.compensation_credit = 2551.05 THEN 'OK'
    WHEN s.submission_date = '2025-12-01' AND SUM(pl.amount) - s.compensation_credit IN (868.04, 14.00) THEN 'OK'
    WHEN s.submission_date = '2026-03-02' AND SUM(pl.amount) - s.compensation_credit = 12.00 THEN 'OK'
    ELSE 'MISMATCH'
  END AS status
FROM fiscal_f24_submissions s
LEFT JOIN fiscal_f24_payment_lines pl ON pl.submission_id = s.id
WHERE s.user_id = 'e877676d-7b9b-434e-af1e-c786c10ddc10'
GROUP BY s.id, s.submission_date, s.compensation_credit
ORDER BY s.submission_date;

COMMIT;

-- End of script. Expected result: every row above shows status = 'OK'.
