-- Normalize client fiscal fields and reduce ambiguity between structured fields
-- (`vat_number`, `fiscal_code`, `billing_name`) and the legacy `tax_id`.

UPDATE public.clients
SET
  billing_name = NULLIF(regexp_replace(btrim(billing_name), '\s+', ' ', 'g'), ''),
  tax_id = NULLIF(upper(regexp_replace(btrim(tax_id), '\s+', '', 'g')), ''),
  vat_number = NULLIF(regexp_replace(btrim(vat_number), '\s+', '', 'g'), ''),
  fiscal_code = NULLIF(upper(regexp_replace(btrim(fiscal_code), '\s+', '', 'g')), ''),
  billing_address_street = NULLIF(regexp_replace(btrim(billing_address_street), '\s+', ' ', 'g'), ''),
  billing_address_number = NULLIF(regexp_replace(btrim(billing_address_number), '\s+', ' ', 'g'), ''),
  billing_postal_code = NULLIF(regexp_replace(btrim(billing_postal_code), '\s+', ' ', 'g'), ''),
  billing_city = NULLIF(regexp_replace(btrim(billing_city), '\s+', ' ', 'g'), ''),
  billing_province = NULLIF(upper(regexp_replace(btrim(billing_province), '\s+', '', 'g')), ''),
  billing_country = NULLIF(regexp_replace(btrim(billing_country), '\s+', ' ', 'g'), ''),
  billing_sdi_code = NULLIF(upper(regexp_replace(btrim(billing_sdi_code), '\s+', '', 'g')), ''),
  billing_pec = NULLIF(lower(btrim(billing_pec)), '');

-- If the fiscal name is the same as the main name, keep only `name`.
UPDATE public.clients
SET billing_name = NULL
WHERE billing_name IS NOT NULL
  AND lower(regexp_replace(btrim(billing_name), '\s+', ' ', 'g')) =
      lower(regexp_replace(btrim(name), '\s+', ' ', 'g'));

-- Backfill structured identifiers from the legacy field only when the mapping is unambiguous.
UPDATE public.clients
SET vat_number = tax_id
WHERE tax_id IS NOT NULL
  AND vat_number IS NULL
  AND tax_id ~ '^[0-9]{11}$';

UPDATE public.clients
SET fiscal_code = tax_id
WHERE tax_id IS NOT NULL
  AND fiscal_code IS NULL
  AND tax_id ~ '^[A-Z0-9]{16}$'
  AND tax_id !~ '^[0-9]{11}$';

-- Once the legacy value is duplicated or migrated into a structured field, clear it.
UPDATE public.clients
SET tax_id = NULL
WHERE tax_id IS NOT NULL
  AND (
    tax_id = vat_number
    OR tax_id = fiscal_code
  );
