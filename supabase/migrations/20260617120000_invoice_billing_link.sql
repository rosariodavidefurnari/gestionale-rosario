-- Invoice billing link: track WHICH financial_document marked a service/expense
-- as invoiced, so "Annulla emissione" (invoice_void) can un-mark exactly the
-- rows the emit marked — instead of matching the free-text `invoice_ref` string.
--
-- Why: emit marks source rows by id (`id IN serviceIds/expenseIds`); the void
-- previously un-marked by `invoice_ref = document_number AND client_id`. Because
-- `invoice_ref` is free-text (user-editable, written by historical imports like
-- `FPR n/23`), a void could sweep unrelated homonym rows back to "Da fatturare"
-- (fiscal/historical data corruption), and a number-only ambiguity guard
-- false-positived on legitimate cross-year numbers (e.g. 1/2024 + 1/2025).
--
-- This FK makes the un-mark symmetric to the emit (by document id), so historical
-- rows (financial_document_id IS NULL) are never touched. Additive + idempotent +
-- replayable; ON DELETE SET NULL is a safety net (the void nulls both fields
-- explicitly before deleting the document).
--
-- No backfill: production has 0 app-emitted invoices (no payment carries a
-- financial_document_id yet); every existing marked row is a historical import
-- that must stay untouched by void.

alter table public.services
  add column if not exists financial_document_id uuid
  references public.financial_documents(id) on delete set null;

alter table public.expenses
  add column if not exists financial_document_id uuid
  references public.financial_documents(id) on delete set null;

create index if not exists idx_services_financial_document_id
  on public.services (financial_document_id);

create index if not exists idx_expenses_financial_document_id
  on public.expenses (financial_document_id);

comment on column public.services.financial_document_id is
  'Set by invoice_emit when the service is billed; un-marked by invoice_void (by this id, not by invoice_ref string). NULL for historical imports.';
comment on column public.expenses.financial_document_id is
  'Set by invoice_emit when the expense is billed; un-marked by invoice_void (by this id, not by invoice_ref string). NULL for historical imports and trigger-generated km rows.';
