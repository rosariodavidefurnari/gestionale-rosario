-- Backfill 2026 financial_documents from real XML-backed constants, with
-- LIVE SRLS stored as a Gustare billing profile rather than an operational
-- client.
--
-- Spec: docs/superpowers/specs/2026-06-22-client-billing-profiles-design.md
-- Plan: docs/superpowers/plans/2026-06-22-live-gustare-billing-profiles-end-to-end.md
--
-- RUN PROTOCOL: run sections separately.
--   1. [C1] Read-only gate. Expected before first apply: verdict OK_TO_APPLY.
--   2. [APPLY] Atomic insert/link. For dry-run wrap with BEGIN; ... ROLLBACK;.
--   3. [C3] Read-only verification. Expected after apply: verdict OK.
--
-- Cash invariant: this script may set payments.financial_document_id only. It
-- must never update payments.amount, payments.status, payments.payment_date or
-- payments.payment_type.

-- ============================================================================
-- [C1] Read-only gate
-- ============================================================================
with target_docs(
  client_name,
  billing_profile_key,
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
      'ASSOCIAZIONE CULTURALE GUSTARE SICILIA',
      'LIVE',
      'FPR 1/26',
      date '2026-03-23',
      date '2026-03-23',
      numeric '2745.00',
      numeric '2745.00',
      null::numeric,
      numeric '2.00',
      'Fatture/2026/IT01879020517A2026_bVF6w.xml'
    ),
    (
      'ASSOCIAZIONE CULTURALE GUSTARE SICILIA',
      'LIVE',
      'FPR 2/26',
      date '2026-04-18',
      date '2026-04-23',
      numeric '2854.03',
      numeric '2854.03',
      null::numeric,
      numeric '2.00',
      'Fatture/2026/IT01879020517A2026_cBc8j.xml'
    ),
    (
      'LAURUS S.R.L.',
      null,
      'FPR 3/26',
      date '2026-05-03',
      date '2026-05-03',
      numeric '352.00',
      numeric '352.00',
      null::numeric,
      numeric '2.00',
      'Fatture/2026/IT01879020517A2026_cVqQ6.xml'
    ),
    (
      'LAURUS S.R.L.',
      null,
      'FPR 4/26',
      date '2026-05-04',
      null::date,
      numeric '285.00',
      numeric '285.00',
      null::numeric,
      numeric '2.00',
      'Fatture/2026/IT01879020517A2026_cXf8T.xml'
    ),
    (
      'ASSOCIAZIONE CULTURALE GUSTARE SICILIA',
      null,
      'FPR 5/26',
      date '2026-05-26',
      date '2026-06-15',
      numeric '5687.10',
      numeric '5687.10',
      null::numeric,
      numeric '2.00',
      'Fatture/2026/IT01879020517A2026_d6UWZ.xml'
    )
),
required_clients as (
  select td.client_name, count(c.id) as client_count
  from (select distinct client_name from target_docs) td
  left join clients c on c.name = td.client_name
  group by td.client_name
),
live_clients as (
  select count(*) as live_client_count
  from clients
  where name = 'LIVE - SOCIETA'' A RESPONSABILITA'' LIMITATA SEMPLIFICATA'
),
target_docs_with_clients as (
  select td.*, c.id as client_id
  from target_docs td
  join clients c on c.name = td.client_name
),
existing_docs as (
  select td.document_number, count(fd.id) as doc_count
  from target_docs_with_clients td
  left join financial_documents fd
    on fd.client_id = td.client_id
   and fd.direction = 'outbound'
   and fd.document_type = 'customer_invoice'
   and btrim(fd.document_number) = btrim(td.document_number)
   and fd.issue_date = td.issue_date
  group by td.document_number
),
live_profiles as (
  select count(cbp.id) as profile_count
  from clients c
  left join client_billing_profiles cbp
    on cbp.client_id = c.id
   and cbp.billing_name = 'LIVE - SOCIETA'' A RESPONSABILITA'' LIMITATA SEMPLIFICATA'
   and cbp.vat_number = '06256710879'
   and cbp.fiscal_code = '06256710879'
   and cbp.billing_sdi_code = 'KRRH6B9'
  where c.name = 'ASSOCIAZIONE CULTURALE GUSTARE SICILIA'
),
single_full_received_payments as (
  select td.document_number, count(p.id) as payment_count
  from target_docs_with_clients td
  left join payments p
    on p.client_id = td.client_id
   and btrim(p.invoice_ref) = btrim(td.document_number)
   and p.status = 'ricevuto'
   and p.financial_document_id is null
   and p.amount = td.total_amount
  group by td.document_number
)
select
  (select count(*) from required_clients where client_count <> 1) as client_count_mismatches,
  (select live_client_count from live_clients) as live_operational_client_count,
  (select profile_count from live_profiles) as live_profile_count,
  (select count(*) from existing_docs where doc_count > 1) as ambiguous_docs,
  (select count(*) from existing_docs where doc_count = 0) as missing_docs,
  (select count(*) from existing_docs where doc_count = 1) as existing_docs,
  (select count(*) from single_full_received_payments where payment_count > 1) as ambiguous_full_payments,
  (select coalesce(sum(payment_count), 0) from single_full_received_payments) as linkable_full_payments,
  case
    when (select count(*) from required_clients where client_count <> 1) = 0
     and (select live_client_count from live_clients) = 0
     and (select profile_count from live_profiles) <= 1
     and (select count(*) from existing_docs where doc_count > 1) = 0
     and (select count(*) from single_full_received_payments where payment_count > 1) = 0
    then 'OK_TO_APPLY'
    else 'STOP'
  end as verdict;

-- ============================================================================
-- [APPLY] Atomic insert docs + optional payment links. Re-runnable.
-- ============================================================================
do $$
declare
  v_gustare_id uuid;
  v_laurus_id uuid;
  v_live_profile_id uuid;
  v_live_client_count int;
  v_inserted_profiles int := 0;
  v_inserted_docs int := 0;
  v_linked int := 0;
  v_ambiguous_docs int;
  v_ambiguous_payments int;
  v_pre text;
  v_post text;
begin
  select count(*) into v_live_client_count
  from clients
  where name = 'LIVE - SOCIETA'' A RESPONSABILITA'' LIMITATA SEMPLIFICATA';

  if v_live_client_count <> 0 then
    raise exception '2026 backfill abort: LIVE exists as operational client (%)', v_live_client_count;
  end if;

  select id into v_gustare_id
  from clients
  where name = 'ASSOCIAZIONE CULTURALE GUSTARE SICILIA';

  if v_gustare_id is null then
    raise exception '2026 backfill abort: Gustare client not found';
  end if;

  select id into v_laurus_id
  from clients
  where name = 'LAURUS S.R.L.';

  if v_laurus_id is null then
    raise exception '2026 backfill abort: LAURUS client not found';
  end if;

  select id into v_live_profile_id
  from client_billing_profiles
  where client_id = v_gustare_id
    and billing_name = 'LIVE - SOCIETA'' A RESPONSABILITA'' LIMITATA SEMPLIFICATA'
    and vat_number = '06256710879'
    and fiscal_code = '06256710879'
    and billing_sdi_code = 'KRRH6B9'
  order by created_at
  limit 1;

  if v_live_profile_id is null then
    insert into client_billing_profiles (
      client_id,
      label,
      billing_name,
      vat_number,
      fiscal_code,
      billing_address_street,
      billing_address_number,
      billing_postal_code,
      billing_city,
      billing_province,
      billing_country,
      billing_sdi_code,
      is_default,
      notes
    )
    values (
      v_gustare_id,
      'LIVE SRLS',
      'LIVE - SOCIETA'' A RESPONSABILITA'' LIMITATA SEMPLIFICATA',
      '06256710879',
      '06256710879',
      'VIA 4 NOVEMBRE',
      '64',
      '95031',
      'ADRANO',
      'CT',
      'IT',
      'KRRH6B9',
      false,
      'Profilo fatturazione per fatture 2026 operative sotto Gustare Sicilia.'
    )
    returning id into v_live_profile_id;
    get diagnostics v_inserted_profiles = row_count;
  end if;

  with target_docs(
    client_id,
    billing_profile_id,
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
      (v_gustare_id, v_live_profile_id, 'FPR 1/26', date '2026-03-23', date '2026-03-23', numeric '2745.00', numeric '2745.00', null::numeric, numeric '2.00', 'Fatture/2026/IT01879020517A2026_bVF6w.xml'),
      (v_gustare_id, v_live_profile_id, 'FPR 2/26', date '2026-04-18', date '2026-04-23', numeric '2854.03', numeric '2854.03', null::numeric, numeric '2.00', 'Fatture/2026/IT01879020517A2026_cBc8j.xml'),
      (v_laurus_id, null::uuid, 'FPR 3/26', date '2026-05-03', date '2026-05-03', numeric '352.00', numeric '352.00', null::numeric, numeric '2.00', 'Fatture/2026/IT01879020517A2026_cVqQ6.xml'),
      (v_laurus_id, null::uuid, 'FPR 4/26', date '2026-05-04', null::date, numeric '285.00', numeric '285.00', null::numeric, numeric '2.00', 'Fatture/2026/IT01879020517A2026_cXf8T.xml'),
      (v_gustare_id, null::uuid, 'FPR 5/26', date '2026-05-26', date '2026-06-15', numeric '5687.10', numeric '5687.10', null::numeric, numeric '2.00', 'Fatture/2026/IT01879020517A2026_d6UWZ.xml')
  )
  insert into financial_documents (
    client_id,
    billing_profile_id,
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
    td.client_id,
    td.billing_profile_id,
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
    'Documento fiscale emesso importato da archivio XML 2026.'
  from target_docs td
  on conflict (client_id, direction, document_number, issue_date) do update
    set billing_profile_id = coalesce(financial_documents.billing_profile_id, excluded.billing_profile_id)
    where financial_documents.billing_profile_id is null
      and excluded.billing_profile_id is not null;
  get diagnostics v_inserted_docs = row_count;

  with target_docs(document_number, client_id) as (
    values
      ('FPR 1/26', v_gustare_id),
      ('FPR 2/26', v_gustare_id),
      ('FPR 3/26', v_laurus_id),
      ('FPR 4/26', v_laurus_id),
      ('FPR 5/26', v_gustare_id)
  ),
  matching_docs_by_number as (
    select td.document_number, count(fd.id) as doc_count
    from target_docs td
    left join financial_documents fd
      on fd.client_id = td.client_id
     and fd.direction = 'outbound'
     and fd.document_type = 'customer_invoice'
     and btrim(fd.document_number) = btrim(td.document_number)
    group by td.document_number
  )
  select count(*) into v_ambiguous_docs
  from matching_docs_by_number
  where doc_count <> 1;

  if v_ambiguous_docs <> 0 then
    raise exception '2026 backfill abort: target docs missing or ambiguous (% problem rows)', v_ambiguous_docs;
  end if;

  with target_docs(document_number, client_id, total_amount) as (
    values
      ('FPR 1/26', v_gustare_id, numeric '2745.00'),
      ('FPR 2/26', v_gustare_id, numeric '2854.03'),
      ('FPR 3/26', v_laurus_id, numeric '352.00'),
      ('FPR 4/26', v_laurus_id, numeric '285.00'),
      ('FPR 5/26', v_gustare_id, numeric '5687.10')
  ),
  matching_payments_by_number as (
    select td.document_number, count(p.id) as payment_count
    from target_docs td
    left join payments p
      on p.client_id = td.client_id
     and btrim(p.invoice_ref) = btrim(td.document_number)
     and p.status = 'ricevuto'
     and p.financial_document_id is null
     and p.amount = td.total_amount
    group by td.document_number
  )
  select count(*) into v_ambiguous_payments
  from matching_payments_by_number
  where payment_count > 1;

  if v_ambiguous_payments <> 0 then
    raise exception '2026 backfill abort: ambiguous full-amount received payments (% problem rows)', v_ambiguous_payments;
  end if;

  select md5(coalesce(string_agg(
           p.id::text || '|' || p.amount::text || '|' || p.status || '|' ||
           coalesce(p.payment_date::text, '') || '|' || coalesce(p.payment_type, ''),
           ',' order by p.id), ''))
    into v_pre
  from payments p
  where exists (
    select 1
    from financial_documents fd
    where fd.client_id = p.client_id
      and fd.direction = 'outbound'
      and fd.document_type = 'customer_invoice'
      and btrim(fd.document_number) = btrim(p.invoice_ref)
      and fd.document_number in ('FPR 1/26', 'FPR 2/26', 'FPR 3/26', 'FPR 4/26', 'FPR 5/26')
  );

  with target_docs(document_number, client_id, total_amount) as (
    values
      ('FPR 1/26', v_gustare_id, numeric '2745.00'),
      ('FPR 2/26', v_gustare_id, numeric '2854.03'),
      ('FPR 3/26', v_laurus_id, numeric '352.00'),
      ('FPR 4/26', v_laurus_id, numeric '285.00'),
      ('FPR 5/26', v_gustare_id, numeric '5687.10')
  )
  update payments p
     set financial_document_id = fd.id
  from target_docs td
  join financial_documents fd
    on fd.client_id = td.client_id
   and fd.direction = 'outbound'
   and fd.document_type = 'customer_invoice'
   and btrim(fd.document_number) = btrim(td.document_number)
  where p.client_id = td.client_id
    and btrim(p.invoice_ref) = btrim(td.document_number)
    and p.status = 'ricevuto'
    and p.financial_document_id is null
    and p.amount = td.total_amount;
  get diagnostics v_linked = row_count;

  select md5(coalesce(string_agg(
           p.id::text || '|' || p.amount::text || '|' || p.status || '|' ||
           coalesce(p.payment_date::text, '') || '|' || coalesce(p.payment_type, ''),
           ',' order by p.id), ''))
    into v_post
  from payments p
  where exists (
    select 1
    from financial_documents fd
    where fd.client_id = p.client_id
      and fd.direction = 'outbound'
      and fd.document_type = 'customer_invoice'
      and btrim(fd.document_number) = btrim(p.invoice_ref)
      and fd.document_number in ('FPR 1/26', 'FPR 2/26', 'FPR 3/26', 'FPR 4/26', 'FPR 5/26')
  );

  if v_pre is distinct from v_post then
    raise exception '2026 backfill abort: payment cash columns changed';
  end if;

  raise notice '2026 backfill OK: profiles inserted %, docs inserted/updated %, payments linked %, cash checksum stable %',
    v_inserted_profiles, v_inserted_docs, v_linked, v_post;
end $$;

-- ============================================================================
-- [C3] Read-only verification
-- ============================================================================
with target_docs(
  client_name,
  billing_profile_key,
  document_number,
  issue_date,
  total_amount,
  source_path
) as (
  values
    ('ASSOCIAZIONE CULTURALE GUSTARE SICILIA', 'LIVE', 'FPR 1/26', date '2026-03-23', numeric '2745.00', 'Fatture/2026/IT01879020517A2026_bVF6w.xml'),
    ('ASSOCIAZIONE CULTURALE GUSTARE SICILIA', 'LIVE', 'FPR 2/26', date '2026-04-18', numeric '2854.03', 'Fatture/2026/IT01879020517A2026_cBc8j.xml'),
    ('LAURUS S.R.L.', null, 'FPR 3/26', date '2026-05-03', numeric '352.00', 'Fatture/2026/IT01879020517A2026_cVqQ6.xml'),
    ('LAURUS S.R.L.', null, 'FPR 4/26', date '2026-05-04', numeric '285.00', 'Fatture/2026/IT01879020517A2026_cXf8T.xml'),
    ('ASSOCIAZIONE CULTURALE GUSTARE SICILIA', null, 'FPR 5/26', date '2026-05-26', numeric '5687.10', 'Fatture/2026/IT01879020517A2026_d6UWZ.xml')
),
live_profile as (
  select cbp.id, cbp.client_id
  from client_billing_profiles cbp
  join clients c on c.id = cbp.client_id
  where c.name = 'ASSOCIAZIONE CULTURALE GUSTARE SICILIA'
    and cbp.billing_name = 'LIVE - SOCIETA'' A RESPONSABILITA'' LIMITATA SEMPLIFICATA'
    and cbp.vat_number = '06256710879'
    and cbp.fiscal_code = '06256710879'
    and cbp.billing_sdi_code = 'KRRH6B9'
),
target_docs_present as (
  select td.document_number, fd.id as document_id, fd.billing_profile_id
  from target_docs td
  join clients c on c.name = td.client_name
  join financial_documents fd
    on fd.client_id = c.id
   and fd.direction = 'outbound'
   and fd.document_type = 'customer_invoice'
   and btrim(fd.document_number) = btrim(td.document_number)
   and fd.issue_date = td.issue_date
   and fd.total_amount = td.total_amount
   and fd.source_path = td.source_path
),
live_docs_without_profile as (
  select tdp.document_id
  from target_docs_present tdp
  join target_docs td on td.document_number = tdp.document_number
  where td.billing_profile_key = 'LIVE'
    and tdp.billing_profile_id is distinct from (select id from live_profile limit 1)
),
multi_linked_received as (
  select financial_document_id
  from payments
  where financial_document_id in (select document_id from target_docs_present)
    and status = 'ricevuto'
  group by financial_document_id
  having count(*) > 1
)
select
  (select count(*) from live_profile) as live_profile_count,
  (select count(*) from target_docs_present) as docs_present,
  (select count(*) from live_docs_without_profile) as live_docs_without_profile,
  (select count(*) from multi_linked_received) as docs_with_multiple_received_payments,
  case
    when (select count(*) from live_profile) = 1
     and (select count(*) from target_docs_present) = 5
     and (select count(*) from live_docs_without_profile) = 0
     and (select count(*) from multi_linked_received) = 0
    then 'OK'
    else 'MISMATCH'
  end as verdict;
