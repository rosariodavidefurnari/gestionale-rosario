-- Fix mutable search_path on all public functions.
-- See: Supabase linter 0011_function_search_path_mutable
--
-- Using 'public' (not '') because all function bodies reference tables
-- with unqualified names (e.g. "contacts" not "public.contacts").
-- This pins the search_path so it cannot be hijacked, while still
-- resolving the unqualified references correctly.

-- Trigger functions (no arguments)
ALTER FUNCTION public.set_updated_at() SET search_path = 'public';
ALTER FUNCTION public.sync_f24_payment_line_user_id() SET search_path = 'public';
ALTER FUNCTION public.prevent_declaration_delete_with_paid_obligations() SET search_path = 'public';
ALTER FUNCTION public.prevent_obligation_delete_with_payments() SET search_path = 'public';
ALTER FUNCTION public.handle_contact_saved() SET search_path = 'public';
ALTER FUNCTION public.handle_project_contact_saved() SET search_path = 'public';
ALTER FUNCTION public.sync_service_km_expense() SET search_path = 'public';
ALTER FUNCTION public.set_sales_id_default() SET search_path = 'public';
ALTER FUNCTION public.handle_company_saved() SET search_path = 'public';

-- Functions with arguments
ALTER FUNCTION public.merge_contacts(bigint, bigint) SET search_path = 'public';
ALTER FUNCTION public.get_avatar_for_email(text) SET search_path = 'public';
ALTER FUNCTION public.get_domain_favicon(text) SET search_path = 'public';
ALTER FUNCTION public.get_user_id_by_email(text) SET search_path = 'public';
