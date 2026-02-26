-- Fix Nisseno services: use correct fee breakdown (187 + 249 = 436)
-- matching all other Gustare Sicilia episodes

UPDATE services
SET fee_shooting = 187,
    fee_editing = 249,
    fee_other = 0
WHERE project_id = (
  SELECT id FROM projects WHERE name = 'Gustare Sicilia — Nisseno'
);
