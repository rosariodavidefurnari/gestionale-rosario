-- =============================================================================
-- Supplementary Import: Diego Caltabiano — pending balance payment
-- Creates a payment record for the outstanding balance of €7,152.10
-- (Total owed €22,241.64 - Total paid €15,089.54)
-- =============================================================================

INSERT INTO payments (client_id, payment_type, amount, status, notes)
SELECT
  c.id,
  'saldo',
  7152.10,
  'in_attesa',
  'Saldo residuo foglio 2 — da saldare'
FROM clients c
WHERE c.name = 'Diego Caltabiano';
