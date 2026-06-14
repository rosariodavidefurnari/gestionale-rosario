-- Fails if fiscal backup tables are exposed through disabled RLS or direct
-- anon/authenticated grants. Intended for remote security verification.

do $$
declare
  missing_table_count integer;
  unsafe_rls_count integer;
  policy_count integer;
  unsafe_effective_privilege_count integer;
begin
  with expected(table_name) as (
    values
      ('fiscal_declarations_backup_20260414'),
      ('fiscal_obligations_backup_20260414'),
      ('fiscal_f24_submissions_backup_20260414'),
      ('fiscal_f24_payment_lines_backup_20260414')
  ),
  actual as (
    select
      e.table_name,
      c.oid,
      c.relrowsecurity
    from expected e
    left join pg_class c
      on c.relname = e.table_name
     and c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p')
  )
  select count(*)
    into missing_table_count
  from actual
  where oid is null;

  if missing_table_count > 0 then
    raise exception
      'Fiscal backup RLS check failed: % target table(s) are missing',
      missing_table_count;
  end if;

  with expected(table_name) as (
    values
      ('fiscal_declarations_backup_20260414'),
      ('fiscal_obligations_backup_20260414'),
      ('fiscal_f24_submissions_backup_20260414'),
      ('fiscal_f24_payment_lines_backup_20260414')
  )
  select count(*)
    into unsafe_rls_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join expected e on e.table_name = c.relname
  where n.nspname = 'public'
    and c.relrowsecurity is not true;

  if unsafe_rls_count > 0 then
    raise exception
      'Fiscal backup RLS check failed: % target table(s) have RLS disabled',
      unsafe_rls_count;
  end if;

  select count(*)
    into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'fiscal_declarations_backup_20260414',
      'fiscal_obligations_backup_20260414',
      'fiscal_f24_submissions_backup_20260414',
      'fiscal_f24_payment_lines_backup_20260414'
    );

  if policy_count > 0 then
    raise exception
      'Fiscal backup RLS check failed: % policy/policies exist on backup tables',
      policy_count;
  end if;

  with expected(table_name) as (
    values
      ('fiscal_declarations_backup_20260414'),
      ('fiscal_obligations_backup_20260414'),
      ('fiscal_f24_submissions_backup_20260414'),
      ('fiscal_f24_payment_lines_backup_20260414')
  ),
  target_tables as (
    select c.oid
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join expected e on e.table_name = c.relname
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  ),
  checked_roles(role_name) as (
    values ('anon'), ('authenticated')
  ),
  checked_privileges(privilege_name) as (
    values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')
  )
  select count(*)
    into unsafe_effective_privilege_count
  from target_tables t
  cross join checked_roles r
  cross join checked_privileges p
  where has_table_privilege(r.role_name, t.oid, p.privilege_name);

  if unsafe_effective_privilege_count > 0 then
    raise exception
      'Fiscal backup RLS check failed: % anon/authenticated effective privilege(s) remain',
      unsafe_effective_privilege_count;
  end if;

  raise notice 'Fiscal backup RLS check passed';
end $$;
