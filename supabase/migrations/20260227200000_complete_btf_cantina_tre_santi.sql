-- =============================================================================
-- Complete two BTF Cantina Tre Santi services (18/09 and 21/10)
-- These were recorded with zero fees — work done but never invoiced.
-- Filling in standard BTF rates: shooting=187, editing=125, km=120 (Cantina Tre Santi)
-- =============================================================================

UPDATE services
SET fee_shooting = 187,
    fee_editing = 125,
    km_distance = 120,
    notes = 'Non fatturato — puntata dedicata alla vendemmia'
WHERE project_id = (SELECT id FROM projects WHERE name = 'Bella tra i Fornelli')
  AND service_date = '2025-09-18';

UPDATE services
SET fee_shooting = 187,
    fee_editing = 125,
    km_distance = 120,
    notes = 'Non fatturato — puntata finale'
WHERE project_id = (SELECT id FROM projects WHERE name = 'Bella tra i Fornelli')
  AND service_date = '2025-10-21';
