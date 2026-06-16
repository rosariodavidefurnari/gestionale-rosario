-- Re-schedule the fiscal deadline cron to authenticate with a dedicated shared
-- secret instead of the service role key.
--
-- WHY: `fiscal_deadline_check` is gated by AuthMiddleware (JWKS / RS256 user
-- JWTs). The service role key the cron previously sent is an HS256/opaque token
-- that JWKS rejects ("Unsupported alg") -> 401 -> zero reminders. The function
-- now also accepts a dedicated `CRON_SHARED_SECRET` (see _shared/cronAuth.ts),
-- so the cron must send that secret as the bearer token.
--
-- The secret lives in Vault under the name `cron_shared_secret`:
--   local:  seeded in supabase/seed.sql (test value)
--   remote: select vault.create_secret('<random>', 'cron_shared_secret');
--           (created by the operator before deploy; never committed)
--
-- Additive + replayable: cron.schedule upserts the job by name; the body falls
-- back to the legacy `service_role_key` only if `cron_shared_secret` is absent,
-- so replaying on an environment without the new Vault secret does not break.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'fiscal-deadline-check-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/fiscal_deadline_check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'cron_shared_secret'),
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
