-- Add CHECK constraint on quotes.service_type to match frontend values
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_service_type_check
  CHECK (service_type IN (
    'wedding', 'battesimo', 'compleanno', 'evento', 'spot', 'sito_web'
  ));
