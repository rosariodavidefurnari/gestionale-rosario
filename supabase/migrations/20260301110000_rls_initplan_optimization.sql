-- Performance fix: wrap auth.uid() in a subselect so PostgreSQL evaluates it
-- once per query instead of once per row (Supabase linter: auth_rls_initplan).

-- clients
DROP POLICY "Authenticated full access" ON public.clients;
CREATE POLICY "Authenticated full access" ON public.clients
  FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- projects
DROP POLICY "Authenticated full access" ON public.projects;
CREATE POLICY "Authenticated full access" ON public.projects
  FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- services
DROP POLICY "Authenticated full access" ON public.services;
CREATE POLICY "Authenticated full access" ON public.services
  FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- quotes
DROP POLICY "Authenticated full access" ON public.quotes;
CREATE POLICY "Authenticated full access" ON public.quotes
  FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- payments
DROP POLICY "Authenticated full access" ON public.payments;
CREATE POLICY "Authenticated full access" ON public.payments
  FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- expenses
DROP POLICY "Authenticated full access" ON public.expenses;
CREATE POLICY "Authenticated full access" ON public.expenses
  FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- settings
DROP POLICY "Authenticated full access" ON public.settings;
CREATE POLICY "Authenticated full access" ON public.settings
  FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- client_tasks
DROP POLICY "auth_all_client_tasks" ON public.client_tasks;
CREATE POLICY "auth_all_client_tasks" ON public.client_tasks
  FOR ALL USING ((select auth.uid()) IS NOT NULL);

-- client_notes
DROP POLICY "auth_all_client_notes" ON public.client_notes;
CREATE POLICY "auth_all_client_notes" ON public.client_notes
  FOR ALL USING ((select auth.uid()) IS NOT NULL);
