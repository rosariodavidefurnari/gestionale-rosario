-- Extend fiscal_obligations.component to track F24 rateazione interests
-- (codice tributo 1668 per erario, DPPI per INPS).
-- Add compensation_credit to fiscal_f24_submissions to track credits used
-- in compensation inside an F24 delega (e.g. saldo sostitutiva in eccesso
-- compensato contro debito INPS).

-- 1. Extend the component CHECK to allow interests
ALTER TABLE fiscal_obligations
  DROP CONSTRAINT IF EXISTS fiscal_obligations_component_check;

ALTER TABLE fiscal_obligations
  ADD CONSTRAINT fiscal_obligations_component_check CHECK (component IN (
    'imposta_saldo',
    'imposta_acconto_1',
    'imposta_acconto_2',
    'imposta_acconto_unico',
    'inps_saldo',
    'inps_acconto_1',
    'inps_acconto_2',
    'bollo',
    'interessi_erario',
    'interessi_inps'
  ));

-- 2. Add compensation_credit to submissions
ALTER TABLE fiscal_f24_submissions
  ADD COLUMN IF NOT EXISTS compensation_credit numeric(10,2) NOT NULL DEFAULT 0
  CHECK (compensation_credit >= 0);

COMMENT ON COLUMN fiscal_f24_submissions.compensation_credit IS
  'Credit used in compensation inside this F24 delega (e.g. saldo sostitutiva in eccesso). sum(payment_lines.amount) - compensation_credit MUST equal the real saldo delega printed on the F24 quietanza.';

-- 3. Rebuild enriched view to expose compensation_credit
DROP VIEW IF EXISTS fiscal_f24_payment_lines_enriched;

CREATE VIEW fiscal_f24_payment_lines_enriched AS
SELECT
  l.id,
  l.submission_id,
  l.obligation_id,
  l.amount,
  l.created_at,
  l.user_id,
  s.submission_date,
  s.compensation_credit
FROM fiscal_f24_payment_lines l
JOIN fiscal_f24_submissions s ON s.id = l.submission_id;

ALTER VIEW fiscal_f24_payment_lines_enriched SET (security_invoker = on);
