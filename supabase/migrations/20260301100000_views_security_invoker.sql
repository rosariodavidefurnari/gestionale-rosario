-- Fix Supabase linter warnings: switch all SECURITY DEFINER views
-- to SECURITY INVOKER so they respect the querying user's RLS policies.

ALTER VIEW public.init_state SET (security_invoker = on);
ALTER VIEW public.contacts_summary SET (security_invoker = on);
ALTER VIEW public.project_financials SET (security_invoker = on);
ALTER VIEW public.monthly_revenue SET (security_invoker = on);
