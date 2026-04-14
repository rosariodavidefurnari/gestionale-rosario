-- =====================================================================
-- Fiscal projections recalculation — 2026-04-14
-- =====================================================================
--
-- Context (continuation of fiscal-reconciliation-2026-04-14.sql):
--
-- After aligning all F24 submissions with the real AdE quietanze, the
-- "future" obligations on Rosario's account (saldo 2025 + acconti 2026)
-- were still holding stale estimates calculated with the old formula
-- "2025 historical total scaled on CRM ratio 2025/2024 with breakdown
-- from the 2023 declaration". That formula was wrong for two reasons:
--
--   1. It used 2023 as baseline, but 2023 was an ATYPICAL year for
--      Rosario: besides the forfettario (4.352 euro revenue), he also
--      received NASPI (~13.208 euro) and a co.co.co with EUROFORM
--      (9.647,52 compensation + 3.379,52 INPS GS) that ended 30/06/2023.
--      NASPI and co.co.co are NOT repeated in 2024/2025.
--
--   2. The breakdown imposta/INPS from 2023 did not reflect the new
--      "pure forfettario" regime visible from 2024 onwards.
--
-- New projection strategy (applied by this script):
--
--   1. Use the REAL 2024 totals as baseline:
--        - total_substitute_tax = 233.00 (not 601.46 as the old stima)
--        - total_inps = 3667.40 (not 2817.63 as the old stima)
--
--   2. Scale 2025 by the REAL CRM income ratio 2025/2024 = 1.8162:
--        - 2024 income (payments.amount where status='ricevuto'): 13740.18
--        - 2025 income: 24954.35
--        - Ratio: 24954.35 / 13740.18 = 1.8162 (+81.6% growth)
--
--   3. Derive 2025 projections:
--        - total_substitute_tax 2025 = 233 × 1.8162 = 423.17
--        - total_inps 2025 = 3667.40 × 1.8162 = 6661.46
--        - saldo_2025 sostitutiva = 423.17 - 233 (advances already paid) = 190.17
--        - saldo_2025 INPS = 6661.46 - 1503.09 (advances already paid) = 5158.37
--
--   4. Derive 2026 acconti with standard pattern:
--        - sostitutiva 50/50 split on 423.17 → 211.59 + 211.58
--        - INPS keeps the 2025 ratio (41% of total dovuto) → 1365.60 + 1365.60
--
-- This must be re-run whenever:
--   - the commercialista delivers the real 2025 tax declaration (update baseline)
--   - the CRM income ratio materially changes (e.g. new year closed)
--
-- Idempotency: plain UPDATE by id — safe to re-run any number of times.
--
-- =====================================================================

BEGIN;

-- Update the 2025 fiscal_declarations projection with new baseline
UPDATE fiscal_declarations
SET total_substitute_tax = 423.17,
    total_inps = 6661.46,
    prior_advances_substitute_tax = 233.00,
    prior_advances_inps = 1503.09,
    notes = 'Dichiarazione Redditi PF 2026 (periodo 2025) - DA PRESENTARE. Proiezione 2026-04-14: totali 2024 reali (233 sost, 3667.40 INPS) scalati sul rapporto incassi CRM 2025/2024 = 24954.35/13740.18 = 1.8162 (+81.6%). Acconti 2025 gia'' versati: 233 sostitutiva (=100%, 116.50+116.50) + 1503.09 INPS (751.55+751.54). Saldo residuo stimato: sostitutiva 190.17, INPS 5158.37. Da aggiornare quando arriva la dichiarazione reale dal commercialista.',
    updated_at = now()
WHERE id = '1866a256-3102-45ee-a512-b70a9560fed5';

-- Update 6 projection obligations with new real-data-based estimates
UPDATE fiscal_obligations
SET amount = 190.17,
    notes = 'Saldo sostitutiva 2025 stimato. Proiezione 2026-04-14 basata su rapporto incassi CRM 2025/2024 = 1.8162 applicato su totali 2024 reali. Totale sostitutiva 2025 stimato 423.17 - 233 acconti gia'' versati = 190.17. Da aggiornare con dichiarazione reale.',
    updated_at = now()
WHERE id = '4387ab51-91d0-422c-9dd5-85bee69b5332';

UPDATE fiscal_obligations
SET amount = 5158.37,
    notes = 'Saldo INPS 2025 stimato. Proiezione 2026-04-14: totale INPS 2025 stimato 6661.46 - 1503.09 acconti gia'' versati = 5158.37. Rapporto incassi CRM 2025/2024 = 1.8162 applicato su totale INPS 2024 reale (3667.40).',
    updated_at = now()
WHERE id = '48d62f70-7f57-4321-b91d-6888d3f3bd35';

UPDATE fiscal_obligations
SET amount = 211.59,
    notes = 'Acconto 1 sostitutiva 2026 stimato. Proiezione 2026-04-14: 50% di totale sostitutiva 2025 stimato 423.17 = 211.59. Scalato con rapporto incassi CRM 2025/2024 = 1.8162.',
    updated_at = now()
WHERE id = 'cdfa377c-180f-47b8-8eca-891bd8ad8769';

UPDATE fiscal_obligations
SET amount = 211.58,
    notes = 'Acconto 2 sostitutiva 2026 stimato. Proiezione 2026-04-14: 50% di totale sostitutiva 2025 stimato 423.17 = 211.58 (arrotondamento).',
    updated_at = now()
WHERE id = '5b98174b-12c4-4828-ba5e-91a965e2ebd4';

UPDATE fiscal_obligations
SET amount = 1365.60,
    notes = 'Acconto 1 INPS 2026 stimato. Proiezione 2026-04-14: 50% di (41% × totale INPS 2025 stimato 6661.46) = 1365.60. Pattern acconti INPS mantenuto dal 2025 (751.55+751.54 = 41% di 3667.40).',
    updated_at = now()
WHERE id = 'dc211760-646d-40a6-9e3f-b2f243a1ad0d';

UPDATE fiscal_obligations
SET amount = 1365.60,
    notes = 'Acconto 2 INPS 2026 stimato. Proiezione 2026-04-14: 50% di (41% × totale INPS 2025 stimato 6661.46) = 1365.60. Pattern acconti INPS mantenuto dal 2025.',
    updated_at = now()
WHERE id = 'a64ea850-631e-4ca1-a436-0f901b7ad759';

-- Historical context note on the 2023 declaration: 2023 was an ATYPICAL year
-- (mixed income: forfettario + NASPI + co.co.co EUROFORM). Future projections
-- must NOT use 2023 as baseline — use 2024 as the "pure forfettario" baseline.
UPDATE fiscal_declarations
SET notes = 'Dichiarazione Redditi PF 2024 (periodo 2023) - commercialista Fabio Capizzi, presentata 14/06/2024. Importato da WhatsApp Fabio Capizzi + PDF REDD 24 FURN. Rateizzato saldo in 3 rate (lug-set 2024). ATTENZIONE: il 2023 e'' un anno ATIPICO per Rosario — oltre al forfettario puro (fatturato ~4.352 euro: Laurus 4.202 + Maxi 150) ha ricevuto anche NASPI (~13.208 euro, 2 CU INPS) e un co.co.co EUROFORM (25/10/2022 - 30/06/2023, compensi 9.647,52 + INPS GS 3.379,52 versata dal datore). NASPI e co.co.co sono terminati nel 2023 e non si ripetono nel 2024/2025 ("puro forfettario"). NON usare il 2023 come baseline per proiezioni fiscali future — usare il 2024 reale (233 sostitutiva + 3667,40 INPS) come punto di partenza.',
    updated_at = now()
WHERE id = '72fd085d-2efe-4c05-b506-309a56339713';

-- Verification
SELECT
  fd.tax_year,
  fd.total_substitute_tax AS tot_sost,
  fd.total_inps AS tot_inps
FROM fiscal_declarations fd
WHERE fd.user_id = 'e877676d-7b9b-434e-af1e-c786c10ddc10'
ORDER BY fd.tax_year;

SELECT
  component,
  competence_year,
  due_date,
  amount
FROM fiscal_obligations
WHERE id IN (
  '4387ab51-91d0-422c-9dd5-85bee69b5332',
  '48d62f70-7f57-4321-b91d-6888d3f3bd35',
  'cdfa377c-180f-47b8-8eca-891bd8ad8769',
  'dc211760-646d-40a6-9e3f-b2f243a1ad0d',
  '5b98174b-12c4-4828-ba5e-91a965e2ebd4',
  'a64ea850-631e-4ca1-a436-0f901b7ad759'
)
ORDER BY competence_year, due_date, component;

COMMIT;
