-- Backfill missing LAURUS financial_documents from real XML-backed constants,
-- then link the already-existing received payments to those documents.
--
-- Spec: docs/superpowers/specs/2026-06-20-missing-invoices-backfill-design.md
-- Plan: docs/superpowers/plans/2026-06-22-missing-laurus-invoices-backfill.md
--
-- RUN PROTOCOL: run sections separately.
--   1. [C1] RED gate, read-only. Expected before apply:
--      missing_docs=3, existing_docs=0, unlinked_payments=3, target_cash_sum=6120.08.
--   2. [APPLY] Atomic insert+link. Stop if inserted/linked counts are not 3
--      on first apply, or 0 on an idempotent rerun. Cash checksum must be stable.
--   3. [C3] GREEN gate, read-only. Expected after apply: verdict=OK.
--
-- STOP if C1 does not match the expected pre-apply state. Do not create 2026
-- documents here: those need real XML under Fatture/2026 first.

-- ============================================================================
-- [C1] RED gate — read-only
-- ============================================================================
with target_docs(
  document_number,
  issue_date,
  due_date,
  total_amount,
  taxable_amount,
  tax_amount,
  stamp_amount,
  source_path
) as (
  values
    (
      'FPR 1/23',
      date '2023-03-21',
      date '2023-03-21',
      numeric '1872.00',
      numeric '1872.00',
      null::numeric,
      null::numeric,
      'Fatture/2023/IT01879020517A2023_bhiYr.xml'
    ),
    (
      'FPR 6/23',
      date '2023-10-24',
      date '2023-11-24',
      numeric '2498.08',
      numeric '2498.08',
      null::numeric,
      numeric '2.00',
      'Fatture/2023/IT01879020517A2023_flFCj.xml'
    ),
    (
      'FPR 1/24',
      date '2024-02-02',
      date '2024-02-29',
      numeric '1750.00',
      numeric '1750.00',
      null::numeric,
      null::numeric,
      'Fatture/2024/IT01879020517A2024_aDUq8.xml'
    )
),
laurus as (
  select id
  from clients
  where name = 'LAURUS S.R.L.'
),
target_payments as (
  select p.*
  from payments p
  join laurus l on l.id = p.client_id
  join target_docs td on btrim(td.document_number) = btrim(p.invoice_ref)
  where p.status = 'ricevuto'
    and p.financial_document_id is null
),
existing_docs as (
  select fd.*
  from financial_documents fd
  join laurus l on l.id = fd.client_id
  join target_docs td
    on btrim(td.document_number) = btrim(fd.document_number)
   and td.issue_date = fd.issue_date
  where fd.direction = 'outbound'
    and fd.document_type = 'customer_invoice'
),
matching_docs_by_number as (
  select td.document_number, count(fd.id) as doc_count
  from target_docs td
  left join financial_documents fd
    on fd.client_id in (select id from laurus)
   and btrim(fd.document_number) = btrim(td.document_number)
   and fd.direction = 'outbound'
   and fd.document_type = 'customer_invoice'
  group by td.document_number
),
matching_payments_by_number as (
  select td.document_number, count(p.id) as payment_count
  from target_docs td
  left join payments p
    on p.client_id in (select id from laurus)
   and btrim(p.invoice_ref) = btrim(td.document_number)
   and p.status = 'ricevuto'
   and p.financial_document_id is null
  group by td.document_number
)
select
  (select count(*) from laurus) as laurus_client_count,
  (select count(*) from target_docs) - (select count(*) from existing_docs) as missing_docs,
  (select count(*) from existing_docs) as existing_docs,
  (select count(*) from target_payments) as unlinked_payments,
  (select coalesce(round(sum(amount)::numeric, 2), 0) from target_payments) as target_cash_sum,
  (select count(*) from matching_docs_by_number where doc_count > 1) as ambiguous_docs,
  (select count(*) from matching_payments_by_number where payment_count > 1) as ambiguous_payments,
  case
    when (select count(*) from laurus) = 1
     and (select count(*) from target_docs) - (select count(*) from existing_docs) = 3
     and (select count(*) from existing_docs) = 0
     and (select count(*) from target_payments) = 3
     and (select coalesce(round(sum(amount)::numeric, 2), 0) from target_payments) = numeric '6120.08'
     and (select count(*) from matching_docs_by_number where doc_count > 1) = 0
     and (select count(*) from matching_payments_by_number where payment_count > 1) = 0
    then 'OK_TO_APPLY'
    else 'STOP'
  end as verdict;

-- ============================================================================
-- [APPLY] — atomic. Insert docs + link payments. Re-runnable.
-- ============================================================================
do $$
declare
  v_laurus_id uuid;
  v_laurus_count int;
  v_existing_docs int;
  v_inserted int;
  v_target_payment_ids uuid[];
  v_expected_links int;
  v_linked int;
  v_ambiguous_docs int;
  v_ambiguous_payments int;
  v_pre text;
  v_post text;
begin
  select count(*) into v_laurus_count
  from clients
  where name = 'LAURUS S.R.L.';

  if v_laurus_count <> 1 then
    raise exception 'LAURUS backfill abort: expected one LAURUS client, found %', v_laurus_count;
  end if;

  select id into v_laurus_id
  from clients
  where name = 'LAURUS S.R.L.';

  with target_docs(document_number, issue_date) as (
    values
      ('FPR 1/23', date '2023-03-21'),
      ('FPR 6/23', date '2023-10-24'),
      ('FPR 1/24', date '2024-02-02')
  )
  select count(*) into v_existing_docs
  from financial_documents fd
  join target_docs td
    on btrim(td.document_number) = btrim(fd.document_number)
   and td.issue_date = fd.issue_date
  where fd.client_id = v_laurus_id
    and fd.direction = 'outbound'
    and fd.document_type = 'customer_invoice';

  with target_docs(
    document_number,
    issue_date,
    due_date,
    total_amount,
    taxable_amount,
    tax_amount,
    stamp_amount,
    source_path
  ) as (
    values
      (
        'FPR 1/23',
        date '2023-03-21',
        date '2023-03-21',
        numeric '1872.00',
        numeric '1872.00',
        null::numeric,
        null::numeric,
        'Fatture/2023/IT01879020517A2023_bhiYr.xml'
      ),
      (
        'FPR 6/23',
        date '2023-10-24',
        date '2023-11-24',
        numeric '2498.08',
        numeric '2498.08',
        null::numeric,
        numeric '2.00',
        'Fatture/2023/IT01879020517A2023_flFCj.xml'
      ),
      (
        'FPR 1/24',
        date '2024-02-02',
        date '2024-02-29',
        numeric '1750.00',
        numeric '1750.00',
        null::numeric,
        null::numeric,
        'Fatture/2024/IT01879020517A2024_aDUq8.xml'
      )
  )
  insert into financial_documents (
    client_id,
    direction,
    xml_document_code,
    document_type,
    related_document_number,
    document_number,
    issue_date,
    due_date,
    total_amount,
    taxable_amount,
    tax_amount,
    stamp_amount,
    currency_code,
    source_path,
    notes
  )
  select
    v_laurus_id,
    'outbound',
    'TD01',
    'customer_invoice',
    null,
    td.document_number,
    td.issue_date,
    td.due_date,
    td.total_amount,
    td.taxable_amount,
    td.tax_amount,
    td.stamp_amount,
    'EUR',
    td.source_path,
    'Documento fiscale emesso importato da archivio XML.'
  from target_docs td
  on conflict (client_id, direction, document_number, issue_date) do nothing;
  get diagnostics v_inserted = row_count;

  if v_existing_docs = 0 and v_inserted <> 3 then
    raise exception 'LAURUS backfill abort: inserted % docs, expected 3', v_inserted;
  end if;
  if v_existing_docs = 3 and v_inserted <> 0 then
    raise exception 'LAURUS backfill abort: idempotent rerun inserted % docs, expected 0', v_inserted;
  end if;
  if v_existing_docs not in (0, 3) then
    raise exception 'LAURUS backfill abort: partial existing doc state %', v_existing_docs;
  end if;

  with target_docs(document_number) as (
    values ('FPR 1/23'), ('FPR 6/23'), ('FPR 1/24')
  ),
  matching_docs_by_number as (
    select td.document_number, count(fd.id) as doc_count
    from target_docs td
    left join financial_documents fd
      on fd.client_id = v_laurus_id
     and btrim(fd.document_number) = btrim(td.document_number)
     and fd.direction = 'outbound'
     and fd.document_type = 'customer_invoice'
    group by td.document_number
  )
  select count(*) into v_ambiguous_docs
  from matching_docs_by_number
  where doc_count <> 1;

  if v_ambiguous_docs <> 0 then
    raise exception 'LAURUS backfill abort: target docs are missing or ambiguous after insert (% problem rows)', v_ambiguous_docs;
  end if;

  with target_docs(document_number) as (
    values ('FPR 1/23'), ('FPR 6/23'), ('FPR 1/24')
  ),
  matching_payments_by_number as (
    select td.document_number, count(p.id) as payment_count
    from target_docs td
    left join payments p
      on p.client_id = v_laurus_id
     and btrim(p.invoice_ref) = btrim(td.document_number)
     and p.status = 'ricevuto'
     and p.financial_document_id is null
    group by td.document_number
  )
  select count(*) into v_ambiguous_payments
  from matching_payments_by_number
  where payment_count > 1;

  if v_ambiguous_payments <> 0 then
    raise exception 'LAURUS backfill abort: more than one unlinked received payment claims a target doc (% problem rows)', v_ambiguous_payments;
  end if;

  with target_docs(document_number) as (
    values ('FPR 1/23'), ('FPR 6/23'), ('FPR 1/24')
  )
  select array_agg(p.id order by p.id), count(*)
    into v_target_payment_ids, v_expected_links
  from payments p
  join target_docs td on btrim(td.document_number) = btrim(p.invoice_ref)
  join financial_documents fd
    on fd.client_id = p.client_id
   and btrim(fd.document_number) = btrim(p.invoice_ref)
   and fd.direction = 'outbound'
   and fd.document_type = 'customer_invoice'
  where p.client_id = v_laurus_id
    and p.status = 'ricevuto'
    and p.financial_document_id is null;

  if v_expected_links not in (0, 3) then
    raise exception 'LAURUS backfill abort: expected link count %, allowed 0 or 3', v_expected_links;
  end if;

  select md5(coalesce(string_agg(
           p.id::text || '|' || p.amount::text || '|' || p.status || '|' ||
           coalesce(p.payment_date::text, '') || '|' || coalesce(p.payment_type, ''),
           ',' order by p.id), ''))
    into v_pre
  from payments p
  where p.id = any(coalesce(v_target_payment_ids, array[]::uuid[]));

  update payments p
     set financial_document_id = fd.id
  from financial_documents fd
  where p.id = any(coalesce(v_target_payment_ids, array[]::uuid[]))
    and p.client_id = v_laurus_id
    and p.status = 'ricevuto'
    and p.financial_document_id is null
    and fd.client_id = p.client_id
    and btrim(fd.document_number) = btrim(p.invoice_ref)
    and fd.direction = 'outbound'
    and fd.document_type = 'customer_invoice';
  get diagnostics v_linked = row_count;

  select md5(coalesce(string_agg(
           p.id::text || '|' || p.amount::text || '|' || p.status || '|' ||
           coalesce(p.payment_date::text, '') || '|' || coalesce(p.payment_type, ''),
           ',' order by p.id), ''))
    into v_post
  from payments p
  where p.id = any(coalesce(v_target_payment_ids, array[]::uuid[]));

  if v_linked <> v_expected_links then
    raise exception 'LAURUS backfill abort: linked % rows, expected %', v_linked, v_expected_links;
  end if;
  if v_pre is distinct from v_post then
    raise exception 'LAURUS backfill abort: cash columns changed';
  end if;

  raise notice 'LAURUS backfill OK: inserted %, linked %, cash checksum stable %', v_inserted, v_linked, v_post;
end $$;

-- ============================================================================
-- [C3] GREEN verify — read-only
-- ============================================================================
with target_docs(document_number, issue_date, due_date, total_amount, taxable_amount, stamp_amount, source_path) as (
  values
    ('FPR 1/23', date '2023-03-21', date '2023-03-21', numeric '1872.00', numeric '1872.00', null::numeric, 'Fatture/2023/IT01879020517A2023_bhiYr.xml'),
    ('FPR 6/23', date '2023-10-24', date '2023-11-24', numeric '2498.08', numeric '2498.08', numeric '2.00', 'Fatture/2023/IT01879020517A2023_flFCj.xml'),
    ('FPR 1/24', date '2024-02-02', date '2024-02-29', numeric '1750.00', numeric '1750.00', null::numeric, 'Fatture/2024/IT01879020517A2024_aDUq8.xml')
),
laurus as (
  select id
  from clients
  where name = 'LAURUS S.R.L.'
),
target_docs_present as (
  select td.document_number, fd.id as document_id
  from target_docs td
  join financial_documents fd
    on fd.client_id in (select id from laurus)
   and fd.direction = 'outbound'
   and fd.document_type = 'customer_invoice'
   and btrim(fd.document_number) = btrim(td.document_number)
   and fd.issue_date = td.issue_date
   and fd.due_date = td.due_date
   and fd.total_amount = td.total_amount
   and fd.taxable_amount = td.taxable_amount
   and fd.tax_amount is null
   and fd.stamp_amount is not distinct from td.stamp_amount
   and fd.currency_code = 'EUR'
   and fd.source_path = td.source_path
),
linked_payments as (
  select p.id
  from payments p
  join target_docs_present tdp on tdp.document_id = p.financial_document_id
  where p.client_id in (select id from laurus)
    and p.status = 'ricevuto'
    and btrim(p.invoice_ref) = btrim(tdp.document_number)
),
remaining_targets as (
  select p.id
  from payments p
  join laurus l on l.id = p.client_id
  join target_docs td on btrim(td.document_number) = btrim(p.invoice_ref)
  where p.status = 'ricevuto'
    and p.financial_document_id is null
)
select
  (select count(*) from laurus) as laurus_client_count,
  (select count(*) from target_docs_present) as docs_present,
  (select count(*) from linked_payments) as linked_payments,
  (select count(*) from remaining_targets) as remaining_targets,
  (select count(*) from (
     select financial_document_id
     from payments
     where financial_document_id is not null
     group by financial_document_id
     having count(*) > 1
   ) multi) as docs_multi_payment,
  case
    when (select count(*) from laurus) = 1
     and (select count(*) from target_docs_present) = 3
     and (select count(*) from linked_payments) = 3
     and (select count(*) from remaining_targets) = 0
     and (select count(*) from (
           select financial_document_id
           from payments
           where financial_document_id is not null
           group by financial_document_id
           having count(*) > 1
         ) multi) = 0
    then 'OK'
    else 'MISMATCH'
  end as verdict;
