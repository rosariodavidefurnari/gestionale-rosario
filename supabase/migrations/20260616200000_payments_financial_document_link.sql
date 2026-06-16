-- Link a payment to the financial_document it settles.
--
-- Anchor for anti-double-counting in the "Emetti fattura" flow: emit creates a
-- payment (status='in_attesa') carrying the financial_document_id; the XML
-- re-import matches on it (primary anchor) and updates the expected payment in
-- place instead of inserting a new one.
--
-- Additive + replayable (DB-2): add column / constraint / index guarded by
-- IF NOT EXISTS. ON DELETE SET NULL: deleting a financial_document must NEVER
-- delete the real cash record (the payment), only unlink it.

alter table public.payments
  add column if not exists financial_document_id uuid;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'payments_financial_document_id_fkey'
      and table_name = 'payments'
  ) then
    alter table public.payments
      add constraint payments_financial_document_id_fkey
      foreign key (financial_document_id)
      references public.financial_documents(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_payments_financial_document_id
  on public.payments (financial_document_id);
