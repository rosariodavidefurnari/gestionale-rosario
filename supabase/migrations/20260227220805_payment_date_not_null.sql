-- A3 + B3: Make payment_date NOT NULL
-- All existing records already have a date (verified before applying)

-- Safety: fill any NULL dates with created_at as fallback
UPDATE public.payments
  SET payment_date = created_at::date
  WHERE payment_date IS NULL;

-- Make column NOT NULL
ALTER TABLE public.payments
  ALTER COLUMN payment_date SET NOT NULL;
