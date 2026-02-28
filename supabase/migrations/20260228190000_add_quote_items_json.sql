ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS quote_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_quote_items_is_array;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_quote_items_is_array
  CHECK (jsonb_typeof(quote_items) = 'array');
