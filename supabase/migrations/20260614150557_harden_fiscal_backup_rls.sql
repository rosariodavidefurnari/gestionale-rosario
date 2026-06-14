-- Harden fiscal backup tables exposed through the public schema.
-- No data is deleted and no permissive policies are created.

do $$
begin
  if to_regclass('public.fiscal_declarations_backup_20260414') is not null then
    execute 'alter table public.fiscal_declarations_backup_20260414 enable row level security';
    execute 'revoke all on table public.fiscal_declarations_backup_20260414 from anon, authenticated, public';
  end if;

  if to_regclass('public.fiscal_obligations_backup_20260414') is not null then
    execute 'alter table public.fiscal_obligations_backup_20260414 enable row level security';
    execute 'revoke all on table public.fiscal_obligations_backup_20260414 from anon, authenticated, public';
  end if;

  if to_regclass('public.fiscal_f24_submissions_backup_20260414') is not null then
    execute 'alter table public.fiscal_f24_submissions_backup_20260414 enable row level security';
    execute 'revoke all on table public.fiscal_f24_submissions_backup_20260414 from anon, authenticated, public';
  end if;

  if to_regclass('public.fiscal_f24_payment_lines_backup_20260414') is not null then
    execute 'alter table public.fiscal_f24_payment_lines_backup_20260414 enable row level security';
    execute 'revoke all on table public.fiscal_f24_payment_lines_backup_20260414 from anon, authenticated, public';
  end if;
end $$;
