-- Drop CHECK constraints on service_type columns.
-- Service types are now dynamically managed via the Settings page,
-- so static CHECK constraints must be removed.

-- quotes: named constraint from migration 20260227230519
ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_service_type_check;

-- services: auto-named inline CHECK from initial schema
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_service_type_check;
