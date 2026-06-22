-- Deterministic RED/GREEN checker for uncollectible receivables.
--
-- Scope: Aidone FPA 1/23, 375 EUR. The credit must be closed as
-- payments.status = 'perso' with write-off metadata, without becoming cash.
--
-- GREEN expectations:
-- - payments accepts status 'perso' and requires writeoff_date/writeoff_reason;
-- - reimbursements cannot be marked as 'perso';
-- - project_financials and client_commercial_position expose total_written_off;
-- - Aidone FPA 1/23 is the single target row, still FK-null to the historical
--   document, and is marked 'perso' with deterministic metadata;
-- - Aidone no longer contributes to balance_due / "Da incassare";
-- - 2023 cash received remains unchanged at the baseline value.
--
-- Run:
--   npm run health:uncollectible
-- or:
--   npx supabase db query --linked -f scripts/check-uncollectible-receivables.sql
do $$
declare
  failures text[] := array[]::text[];
  has_writeoff_date boolean;
  has_writeoff_reason boolean;
  has_client_written_off boolean;
  has_project_written_off boolean;
  status_check_count integer;
  metadata_check_count integer;
  reimbursement_check_count integer;
  target_count integer;
  target record;
  client_position record;
  project_position record;
  cash_2023 numeric;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payments'
      and column_name = 'writeoff_date'
  ) into has_writeoff_date;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payments'
      and column_name = 'writeoff_reason'
  ) into has_writeoff_reason;

  if not has_writeoff_date then
    failures := array_append(failures, 'payments.writeoff_date missing');
  end if;

  if not has_writeoff_reason then
    failures := array_append(failures, 'payments.writeoff_reason missing');
  end if;

  select count(*)
    into status_check_count
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%'
    and pg_get_constraintdef(oid) ilike '%perso%';

  if status_check_count = 0 then
    failures := array_append(failures, 'payments status CHECK does not include perso');
  end if;

  select count(*)
    into metadata_check_count
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%perso%'
    and pg_get_constraintdef(oid) ilike '%writeoff_date%'
    and pg_get_constraintdef(oid) ilike '%writeoff_reason%';

  if metadata_check_count = 0 then
    failures := array_append(failures, 'write-off metadata CHECK missing');
  end if;

  select count(*)
    into reimbursement_check_count
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%perso%'
    and pg_get_constraintdef(oid) ilike '%rimborso%'
    and pg_get_constraintdef(oid) ilike '%payment_type%';

  if reimbursement_check_count = 0 then
    failures := array_append(failures, 'rimborso cannot be perso CHECK missing');
  end if;

  select count(*)
    into target_count
  from public.payments p
  join public.clients c on c.id = p.client_id
  where btrim(p.invoice_ref) = 'FPA 1/23'
    and p.amount = 375
    and c.name ilike '%Aidone%';

  if target_count <> 1 then
    failures := array_append(failures, format('Aidone FPA 1/23 target count is %s, expected 1', target_count));
  end if;

  if target_count = 1 then
    if has_writeoff_date and has_writeoff_reason then
      execute
        'select p.id, p.client_id, p.project_id, p.payment_date, p.payment_type,
                p.amount, p.invoice_ref, p.status, p.financial_document_id,
                p.writeoff_date, p.writeoff_reason
           from public.payments p
           join public.clients c on c.id = p.client_id
          where btrim(p.invoice_ref) = $1
            and p.amount = $2
            and c.name ilike $3'
        into target
        using 'FPA 1/23', 375, '%Aidone%';
    else
      select p.id, p.client_id, p.project_id, p.payment_date, p.payment_type,
             p.amount, p.invoice_ref, p.status, p.financial_document_id,
             null::date as writeoff_date, null::text as writeoff_reason
        into target
      from public.payments p
      join public.clients c on c.id = p.client_id
        where btrim(p.invoice_ref) = 'FPA 1/23'
          and p.amount = 375
          and c.name ilike '%Aidone%';
    end if;

    if target.status <> 'perso' then
      failures := array_append(failures, format('Aidone FPA 1/23 status is %s, expected perso', target.status));
    end if;

    if target.payment_date <> date '2023-10-30' then
      failures := array_append(failures, format('Aidone FPA 1/23 payment_date is %s, expected 2023-10-30', target.payment_date));
    end if;

    if target.payment_type = 'rimborso' then
      failures := array_append(failures, 'Aidone FPA 1/23 is a rimborso, expected client receivable');
    end if;

    if target.financial_document_id is not null then
      failures := array_append(failures, 'Aidone FPA 1/23 must remain financial_document_id NULL');
    end if;

    if has_writeoff_date and target.writeoff_date is distinct from date '2026-06-22' then
      failures := array_append(failures, format('Aidone writeoff_date is %s, expected 2026-06-22', target.writeoff_date));
    end if;

    if has_writeoff_reason and coalesce(btrim(target.writeoff_reason), '') = '' then
      failures := array_append(failures, 'Aidone writeoff_reason missing');
    end if;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'client_commercial_position'
      and column_name = 'total_written_off'
  ) into has_client_written_off;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_financials'
      and column_name = 'total_written_off'
  ) into has_project_written_off;

  if not has_client_written_off then
    failures := array_append(failures, 'client_commercial_position.total_written_off missing');
  end if;

  if not has_project_written_off then
    failures := array_append(failures, 'project_financials.total_written_off missing');
  end if;

  if target_count = 1 and has_client_written_off then
    execute
      'select total_paid, total_written_off, balance_due
         from public.client_commercial_position
        where client_id = $1'
      into client_position
      using target.client_id;

    if coalesce(client_position.total_written_off, 0) < 375 then
      failures := array_append(
        failures,
        format('Aidone client total_written_off is %s, expected at least 375', coalesce(client_position.total_written_off, 0))
      );
    end if;

    if coalesce(client_position.balance_due, 0) > 0 then
      failures := array_append(
        failures,
        format('Aidone client balance_due is %s, expected 0 after write-off', coalesce(client_position.balance_due, 0))
      );
    end if;
  end if;

  if target_count = 1 and has_project_written_off then
    execute
      'select total_paid, total_written_off, balance_due
         from public.project_financials
        where project_id = $1'
      into project_position
      using target.project_id;

    if coalesce(project_position.total_paid, 0) <> 0 then
      failures := array_append(
        failures,
        format('Aidone project total_paid is %s, expected 0', coalesce(project_position.total_paid, 0))
      );
    end if;

    if coalesce(project_position.total_written_off, 0) <> 375 then
      failures := array_append(
        failures,
        format('Aidone project total_written_off is %s, expected 375', coalesce(project_position.total_written_off, 0))
      );
    end if;

    if coalesce(project_position.balance_due, 0) <> 0 then
      failures := array_append(
        failures,
        format('Aidone project balance_due is %s, expected 0', coalesce(project_position.balance_due, 0))
      );
    end if;
  end if;

  select round(coalesce(sum(amount), 0), 2)
    into cash_2023
  from public.payments
  where status = 'ricevuto'
    and payment_date >= date '2023-01-01'
    and payment_date < date '2024-01-01';

  if cash_2023 <> 6273.26 then
    failures := array_append(failures, format('cash 2023 changed: %s, expected 6273.26', cash_2023));
  end if;

  if array_length(failures, 1) is not null then
    raise exception 'uncollectible receivables check failed: %', array_to_string(failures, '; ');
  end if;

  raise notice 'uncollectible receivables: GREEN (Aidone FPA 1/23 written off without cash/fiscal drift)';
end $$;
