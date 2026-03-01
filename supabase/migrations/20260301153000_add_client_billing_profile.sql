ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS billing_name TEXT,
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_address_street TEXT,
  ADD COLUMN IF NOT EXISTS billing_address_number TEXT,
  ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_city TEXT,
  ADD COLUMN IF NOT EXISTS billing_province TEXT,
  ADD COLUMN IF NOT EXISTS billing_country TEXT,
  ADD COLUMN IF NOT EXISTS billing_sdi_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_pec TEXT;
