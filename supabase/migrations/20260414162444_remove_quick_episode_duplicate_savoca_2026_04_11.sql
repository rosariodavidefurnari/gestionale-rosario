-- Cleanup for the duplicate service created by the Quick Episode flow before
-- the client_id-inheritance fix.
--
-- Root cause (now fixed in code):
--   buildQuickEpisodeServiceCreateData in
--   src/components/atomic-crm/projects/quickEpisodePersistence.ts was not
--   passing client_id from the selected project, so Quick Episode writes
--   produced orphaned services (project_id set, client_id NULL). A single
--   orphan slipped into production (service acc079b0-...) and showed up as a
--   visible duplicate of the real service ed62a7bc-... on 2026-04-11 for
--   project fa7c7ae3-... (ASSOCIAZIONE CULTURALE VALE IL VIAGGIO).
--
-- Why DELETE and not UPDATE/backfill:
--   The orphan IS a duplicate of ed62a7bc-... (same project, same date, same
--   fees, same km, same Europe/Rome business day). The canonical record is the
--   earlier one (ed62a7bc) which has precise timings (06:30–12:30), the
--   correct description ("Savoca - Bar Vitelli"), and a valid client_id.
--
-- Why this migration is idempotent:
--   The DELETE is scoped by id AND a compound fingerprint (project, NULL
--   client_id, orphan description). If the row was already removed (or never
--   existed — fresh local DB), the DELETE affects 0 rows. Safe to replay.
--
-- Side-effects handled by the schema:
--   - expenses.source_service_id has ON DELETE CASCADE, so the auto-generated
--     km expense (99be088c-...) tied to this service is removed in the same
--     statement.
--
-- Not handled by this migration:
--   - Google Calendar event 5po1iql332gi8g3c8u8u3vtdtg is NOT removed from
--     Google Calendar (no DB access). The user should delete that event
--     manually from the calendar UI once this migration is deployed. The
--     canonical event (gm5n0oboqj91lpack33k4l11c0) remains intact.

DELETE FROM services
WHERE id = 'acc079b0-1d41-4936-8d58-1fe522c0e8eb'
  AND project_id = 'fa7c7ae3-f422-4a55-ae3e-faf14347705f'
  AND client_id IS NULL
  AND all_day = true
  AND description = 'Acireale Bar Vitelli';
