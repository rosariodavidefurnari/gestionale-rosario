-- Correct the historical "Diego Caltabiano" import:
-- the fiscal customer evidenced by the invoice XML archive is
-- "ASSOCIAZIONE CULTURALE GUSTARE SICILIA" (CF 05416820875),
-- while Diego Caltabiano is the operational referent.

DO $$
DECLARE
  v_source_id UUID;
  v_target_id UUID;
  v_source_notes TEXT;
  v_source_phone TEXT;
  v_source_email TEXT;
  v_source_address TEXT;
  v_source_source TEXT;
  v_source_tags BIGINT[];
BEGIN
  SELECT
    c.id,
    c.notes,
    c.phone,
    c.email,
    c.address,
    c.source,
    c.tags
  INTO
    v_source_id,
    v_source_notes,
    v_source_phone,
    v_source_email,
    v_source_address,
    v_source_source,
    v_source_tags
  FROM public.clients c
  WHERE c.name = 'Diego Caltabiano'
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.client_id = c.id
        AND p.name IN ('Gustare Sicilia', 'Bella tra i Fornelli')
    )
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_source_id IS NULL THEN
    RETURN;
  END IF;

  SELECT c.id
  INTO v_target_id
  FROM public.clients c
  WHERE c.name = 'ASSOCIAZIONE CULTURALE GUSTARE SICILIA'
  ORDER BY
    CASE WHEN c.id = v_source_id THEN 0 ELSE 1 END,
    c.created_at DESC
  LIMIT 1;

  IF v_target_id IS NULL THEN
    v_target_id := v_source_id;
  END IF;

  IF v_target_id <> v_source_id THEN
    UPDATE public.projects
    SET client_id = v_target_id
    WHERE client_id = v_source_id;

    UPDATE public.quotes
    SET client_id = v_target_id
    WHERE client_id = v_source_id;

    UPDATE public.payments
    SET client_id = v_target_id
    WHERE client_id = v_source_id;

    UPDATE public.expenses
    SET client_id = v_target_id
    WHERE client_id = v_source_id;

    UPDATE public.client_tasks
    SET client_id = v_target_id
    WHERE client_id = v_source_id;

    UPDATE public.client_notes
    SET client_id = v_target_id
    WHERE client_id = v_source_id;
  END IF;

  UPDATE public.clients AS target
  SET
    name = 'ASSOCIAZIONE CULTURALE GUSTARE SICILIA',
    billing_name = NULL,
    fiscal_code = COALESCE(NULLIF(target.fiscal_code, ''), '05416820875'),
    billing_address_street = COALESCE(
      NULLIF(target.billing_address_street, ''),
      'Via Marino'
    ),
    billing_postal_code = COALESCE(
      NULLIF(target.billing_postal_code, ''),
      '95031'
    ),
    billing_city = COALESCE(NULLIF(target.billing_city, ''), 'Adrano'),
    billing_province = COALESCE(NULLIF(target.billing_province, ''), 'CT'),
    billing_country = COALESCE(NULLIF(target.billing_country, ''), 'IT'),
    phone = COALESCE(NULLIF(target.phone, ''), NULLIF(v_source_phone, '')),
    email = COALESCE(NULLIF(target.email, ''), NULLIF(v_source_email, '')),
    address = COALESCE(NULLIF(target.address, ''), NULLIF(v_source_address, '')),
    source = COALESCE(target.source, v_source_source),
    notes = (
      SELECT string_agg(line, E'\n')
      FROM (
        SELECT DISTINCT line
        FROM unnest(
          ARRAY[
            NULLIF(btrim(target.notes), ''),
            CASE
              WHEN v_target_id <> v_source_id
                THEN NULLIF(btrim(v_source_notes), '')
              ELSE NULL
            END,
            'Referente operativo: Diego Caltabiano.'
          ]
        ) AS line
        WHERE line IS NOT NULL
      ) AS merged_lines
    ),
    tags = (
      SELECT COALESCE(array_agg(DISTINCT tag), '{}'::BIGINT[])
      FROM unnest(
        COALESCE(target.tags, '{}'::BIGINT[]) ||
        CASE
          WHEN v_target_id <> v_source_id
            THEN COALESCE(v_source_tags, '{}'::BIGINT[])
          ELSE '{}'::BIGINT[]
        END
      ) AS tag
    ),
    updated_at = NOW()
  WHERE target.id = v_target_id;

  IF v_target_id <> v_source_id THEN
    DELETE FROM public.clients
    WHERE id = v_source_id;
  END IF;
END $$;
