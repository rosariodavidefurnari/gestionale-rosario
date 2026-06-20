-- BR2 — Backfill payments.financial_document_id for the historical RECEIVED
-- payments that reference an emitted outbound customer invoice.
--
-- Spec:  docs/superpowers/specs/2026-06-20-br2-payments-financial-documents-reconciliation-design.md
-- Plan:  docs/superpowers/plans/2026-06-20-br2-payments-financial-documents-reconciliation.md
--
-- WHAT:  set payments.financial_document_id ONLY where it is NULL AND the
--        payment is 'ricevuto' AND it matches EXACTLY ONE outbound customer
--        invoice on (client_id, trim(document_number)=trim(invoice_ref)).
--        Additive, idempotent (2nd run = 0 rows). Touches ONLY the FK column.
--
-- EXCLUDED by design (U5-A): the 1 'scaduto' payment FPA 1/23. Linking it would
--        make a 2023 historical doc void-eligible (canVoidInvoiceFromPayments)
--        -> "Annulla emissione" could delete real cash. It stays FK NULL.
--
-- RUN PROTOCOL (MCP execute_sql or psql -f). MCP returns only the LAST
-- statement's resultset, so run the sections as SEPARATE calls:
--   1. [C1]  read-only  -> PROD must show eligible_count=25, already_linked=0  (RED gate)
--   2. [C2]  read-only  -> verdict 'OK' (PROD-pinned 25/1/6/32)
--   2b.[C2-DETAIL] read-only (optional) -> one row per payment with its decision
--   3. [APPLY] one call -> atomic DO block: cash checksum + UPDATE + RAISE-on-mismatch
--   4. [C3]  read-only  -> verdict 'OK' (linked=25, remaining=0, uniqueness, scaduto NULL)
--
-- STOP if [C1] != 25/0, or [C2]/[C3] verdict != 'OK'. Do NOT apply blind.
-- LOCAL note: on the seed the oracle differs (no scaduto, ~28 eligible). Locally
-- read eligible_count at runtime; the 25/1/6/32 verdict is PROD-pinned (snapshot
-- 2026-06-20). The fail-closed safety branches are unit-tested in
-- scripts/br2LinkDecider.test.ts (no seed/prod row triggers them).


-- ============================================================================
-- [C1] RED gate — read-only
-- ============================================================================
with eligible as (
  select p.id as payment_id, fd.id as doc_id
  from payments p
  join financial_documents fd
    on fd.client_id = p.client_id
   and btrim(fd.document_number) = btrim(p.invoice_ref)
   and fd.direction = 'outbound'
   and fd.document_type = 'customer_invoice'
  where p.financial_document_id is null
    and p.status = 'ricevuto'
    and btrim(coalesce(p.invoice_ref, '')) <> ''
    -- 1:1 fail-closed (payment side): no second outbound customer invoice matches
    and not exists (
      select 1 from financial_documents fd2
      where fd2.client_id = p.client_id
        and btrim(fd2.document_number) = btrim(p.invoice_ref)
        and fd2.direction = 'outbound'
        and fd2.document_type = 'customer_invoice'
        and fd2.id <> fd.id
    )
    -- 1:1 fail-closed (doc side): no second received unlinked payment claims this doc
    and not exists (
      select 1 from payments p2
      where p2.client_id = fd.client_id
        and btrim(p2.invoice_ref) = btrim(fd.document_number)
        and p2.status = 'ricevuto'
        and p2.financial_document_id is null
        and p2.id <> p.id
    )
)
select
  (select count(*) from eligible)                                          as eligible_count,   -- PROD expect 25
  (select count(*) from payments where financial_document_id is not null)  as already_linked;   -- PROD expect 0


-- ============================================================================
-- [C2] verdict — read-only (PROD-pinned partition 25 + 1 + 6 = 32)
-- ============================================================================
with eligible as (
  select p.id as payment_id
  from payments p
  join financial_documents fd
    on fd.client_id = p.client_id
   and btrim(fd.document_number) = btrim(p.invoice_ref)
   and fd.direction = 'outbound'
   and fd.document_type = 'customer_invoice'
  where p.financial_document_id is null
    and p.status = 'ricevuto'
    and btrim(coalesce(p.invoice_ref, '')) <> ''
    and not exists (
      select 1 from financial_documents fd2
      where fd2.client_id = p.client_id
        and btrim(fd2.document_number) = btrim(p.invoice_ref)
        and fd2.direction = 'outbound' and fd2.document_type = 'customer_invoice'
        and fd2.id <> fd.id
    )
    and not exists (
      select 1 from payments p2
      where p2.client_id = fd.client_id
        and btrim(p2.invoice_ref) = btrim(fd.document_number)
        and p2.status = 'ricevuto' and p2.financial_document_id is null
        and p2.id <> p.id
    )
),
counts as (
  select
    (select count(*) from eligible)                                        as link_cnt,
    (select count(*) from payments p
       where p.status = 'scaduto'
         and exists (
           select 1 from financial_documents fd
           where fd.client_id = p.client_id
             and btrim(fd.document_number) = btrim(p.invoice_ref)
             and fd.direction = 'outbound' and fd.document_type = 'customer_invoice'
         ))                                                                 as skip_scaduto_cnt,
    (select count(*) from payments p
       where p.status = 'ricevuto' and p.financial_document_id is null
         and not exists (
           select 1 from financial_documents fd
           where fd.client_id = p.client_id
             and btrim(fd.document_number) = btrim(p.invoice_ref)
             and fd.direction = 'outbound' and fd.document_type = 'customer_invoice'
         ))                                                                 as skip_no_doc_cnt,
    (select count(*) from payments)                                        as total_payments
)
select
  link_cnt, skip_scaduto_cnt, skip_no_doc_cnt, total_payments,
  (link_cnt + skip_scaduto_cnt + skip_no_doc_cnt)                          as partition_sum,
  case
    when link_cnt = 25 and skip_scaduto_cnt = 1 and skip_no_doc_cnt = 6
         and total_payments = 32
         and (link_cnt + skip_scaduto_cnt + skip_no_doc_cnt) = total_payments
    then 'OK' else 'MISMATCH'
  end                                                                       as verdict
from counts;


-- ============================================================================
-- [C2-DETAIL] per-payment decision — read-only (informational, no silent caps)
-- ============================================================================
with eligible as (
  select p.id as payment_id, fd.id as doc_id
  from payments p
  join financial_documents fd
    on fd.client_id = p.client_id
   and btrim(fd.document_number) = btrim(p.invoice_ref)
   and fd.direction = 'outbound' and fd.document_type = 'customer_invoice'
  where p.financial_document_id is null and p.status = 'ricevuto'
    and btrim(coalesce(p.invoice_ref, '')) <> ''
    and not exists (select 1 from financial_documents fd2
      where fd2.client_id = p.client_id and btrim(fd2.document_number) = btrim(p.invoice_ref)
        and fd2.direction = 'outbound' and fd2.document_type = 'customer_invoice' and fd2.id <> fd.id)
    and not exists (select 1 from payments p2
      where p2.client_id = fd.client_id and btrim(p2.invoice_ref) = btrim(fd.document_number)
        and p2.status = 'ricevuto' and p2.financial_document_id is null and p2.id <> p.id)
)
select
  p.id as payment_id, p.invoice_ref, p.status, p.amount, e.doc_id,
  case
    when e.doc_id is not null then 'link'
    when p.financial_document_id is not null then 'skip:already_linked'
    when p.status <> 'ricevuto' then 'skip:not_ricevuto'
    when not exists (select 1 from financial_documents fd
      where fd.client_id = p.client_id and btrim(fd.document_number) = btrim(p.invoice_ref)
        and fd.direction = 'outbound' and fd.document_type = 'customer_invoice') then 'skip:no_doc'
    else 'skip:ambiguous_or_guard'
  end as decision,
  -- flags: subsets of the linked set, reported (not corrected) — bollo/+25%
  exists (select 1 from financial_documents fd
    where fd.client_id = p.client_id and btrim(fd.document_number) = btrim(p.invoice_ref)
      and fd.direction = 'outbound' and coalesce(fd.stamp_amount, 0) > 0) as flag_bollo,
  exists (select 1 from financial_documents fd
    where fd.client_id = p.client_id and btrim(fd.document_number) = btrim(p.invoice_ref)
      and fd.direction = 'outbound' and round(p.amount, 2) <> round(fd.total_amount, 2)) as flag_amount_divergent
from payments p
left join eligible e on e.payment_id = p.id
order by decision, p.invoice_ref;


-- ============================================================================
-- [APPLY] — ONE call. Atomic: cash checksum (INV-1) + UPDATE + RAISE-on-mismatch.
-- A RAISE rolls the whole statement back (no partial write). Re-runnable.
-- ============================================================================
do $$
declare
  v_ids       uuid[];
  v_expected  int;
  v_linked    int;
  v_pre       text;
  v_post      text;
begin
  -- canonical eligible payment ids
  select array_agg(payment_id order by payment_id) into v_ids
  from (
    select p.id as payment_id
    from payments p
    join financial_documents fd
      on fd.client_id = p.client_id
     and btrim(fd.document_number) = btrim(p.invoice_ref)
     and fd.direction = 'outbound' and fd.document_type = 'customer_invoice'
    where p.financial_document_id is null and p.status = 'ricevuto'
      and btrim(coalesce(p.invoice_ref, '')) <> ''
      and not exists (select 1 from financial_documents fd2
        where fd2.client_id = p.client_id and btrim(fd2.document_number) = btrim(p.invoice_ref)
          and fd2.direction = 'outbound' and fd2.document_type = 'customer_invoice' and fd2.id <> fd.id)
      and not exists (select 1 from payments p2
        where p2.client_id = fd.client_id and btrim(p2.invoice_ref) = btrim(fd.document_number)
          and p2.status = 'ricevuto' and p2.financial_document_id is null and p2.id <> p.id)
  ) e;

  v_expected := coalesce(array_length(v_ids, 1), 0);

  -- INV-1 checksum BEFORE — cash columns of the affected payments (NOT the FK)
  select md5(coalesce(string_agg(
           p.id::text || '|' || p.amount::text || '|' || p.status || '|' ||
           coalesce(p.payment_date::text, '') || '|' || coalesce(p.payment_type, ''),
           ',' order by p.id), ''))
    into v_pre
  from payments p where p.id = any(v_ids);

  -- the ONLY mutation: set the FK on the eligible rows
  update payments p
     set financial_document_id = fd.id
  from financial_documents fd
  where p.id = any(v_ids)
    and p.financial_document_id is null
    and p.status = 'ricevuto'
    and fd.client_id = p.client_id
    and btrim(fd.document_number) = btrim(p.invoice_ref)
    and fd.direction = 'outbound'
    and fd.document_type = 'customer_invoice';
  get diagnostics v_linked = row_count;

  -- INV-1 checksum AFTER — must be byte-identical (only the FK changed)
  select md5(coalesce(string_agg(
           p.id::text || '|' || p.amount::text || '|' || p.status || '|' ||
           coalesce(p.payment_date::text, '') || '|' || coalesce(p.payment_type, ''),
           ',' order by p.id), ''))
    into v_post
  from payments p where p.id = any(v_ids);

  if v_linked <> v_expected then
    raise exception 'BR2 ABORT: linked % <> expected % (rolled back)', v_linked, v_expected;
  end if;
  if v_pre is distinct from v_post then
    raise exception 'BR2 ABORT: INV-1 cash columns changed (rolled back)';
  end if;
  raise notice 'BR2 OK: linked % rows, cash checksum stable (%)', v_linked, v_post;
end $$;


-- ============================================================================
-- [C3] GREEN verify — read-only (after APPLY)
-- ============================================================================
with eligible as (
  select p.id as payment_id
  from payments p
  join financial_documents fd
    on fd.client_id = p.client_id
   and btrim(fd.document_number) = btrim(p.invoice_ref)
   and fd.direction = 'outbound' and fd.document_type = 'customer_invoice'
  where p.financial_document_id is null and p.status = 'ricevuto'
    and btrim(coalesce(p.invoice_ref, '')) <> ''
    and not exists (select 1 from financial_documents fd2
      where fd2.client_id = p.client_id and btrim(fd2.document_number) = btrim(p.invoice_ref)
        and fd2.direction = 'outbound' and fd2.document_type = 'customer_invoice' and fd2.id <> fd.id)
    and not exists (select 1 from payments p2
      where p2.client_id = fd.client_id and btrim(p2.invoice_ref) = btrim(fd.document_number)
        and p2.status = 'ricevuto' and p2.financial_document_id is null and p2.id <> p.id)
)
select
  (select count(*) from payments where financial_document_id is not null)            as linked,             -- PROD expect 25
  (select count(*) from eligible)                                                    as remaining_eligible, -- expect 0
  (select count(*) from (
     select financial_document_id from payments
     where financial_document_id is not null
     group by financial_document_id having count(*) > 1) x)                          as docs_multi_payment, -- expect 0 (INV-2)
  (select financial_document_id from payments
     where btrim(invoice_ref) = 'FPA 1/23' and status = 'scaduto' limit 1)           as scaduto_fk,         -- expect NULL
  (select count(*) from financial_document_cash_allocations)                         as cash_alloc_rows,    -- expect 0 (dead column)
  case
    when (select count(*) from payments where financial_document_id is not null) >= 25
     and (select count(*) from eligible) = 0
     and (select count(*) from (
            select financial_document_id from payments where financial_document_id is not null
            group by financial_document_id having count(*) > 1) x) = 0
     and (select financial_document_id from payments
            where btrim(invoice_ref) = 'FPA 1/23' and status = 'scaduto' limit 1) is null
    then 'OK' else 'MISMATCH'
  end                                                                                 as verdict;
