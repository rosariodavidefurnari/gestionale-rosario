-- Fix SECURITY DEFINER on views that lost security_invoker=on after being
-- recreated in later migrations without the clause.
-- See: Supabase linter 0010_security_definer_view

ALTER VIEW public.monthly_revenue SET (security_invoker = on);
ALTER VIEW public.analytics_yearly_competence_revenue SET (security_invoker = on);
ALTER VIEW public.financial_documents_summary SET (security_invoker = on);
