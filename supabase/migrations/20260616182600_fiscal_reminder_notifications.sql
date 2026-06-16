-- Idempotency marker for imminent fiscal-deadline notifications.
--
-- `fiscal_deadline_check` runs daily via pg_cron. Without a marker, every run
-- within the NOTIFY window (<= 7 days before a deadline) would re-send the same
-- email + WhatsApp, producing daily spam. This table records, per deadline and
-- per channel, that a notification has already been sent, so each (deadline,
-- channel) pair fires at most once.
--
-- Additive, replayable: `create table if not exists` + idempotent policy guard.
-- The in-app `client_tasks` reminders keep their own cross-run dedup and are
-- unaffected by this table.

create table if not exists public.fiscal_reminder_notifications (
  id uuid primary key default gen_random_uuid(),
  deadline_key text not null,
  channel text not null,
  sent_at timestamptz not null default now(),
  constraint fiscal_reminder_notifications_deadline_channel_unique
    unique (deadline_key, channel)
);

alter table public.fiscal_reminder_notifications enable row level security;

-- Business table: authenticated users only (the cron acts via the service role,
-- which bypasses RLS). No anonymous access.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'fiscal_reminder_notifications'
      and policyname = 'fiscal_reminder_notifications_authenticated'
  ) then
    create policy fiscal_reminder_notifications_authenticated
      on public.fiscal_reminder_notifications
      as permissive
      for all
      to authenticated
      using (auth.uid() is not null)
      with check (auth.uid() is not null);
  end if;
end $$;

grant select, insert, update, delete
  on public.fiscal_reminder_notifications to authenticated;
grant select, insert, update, delete
  on public.fiscal_reminder_notifications to service_role;
