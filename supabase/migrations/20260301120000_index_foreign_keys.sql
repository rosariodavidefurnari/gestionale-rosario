-- Add covering indexes on all unindexed foreign keys.
-- Fixes Supabase linter INFO: unindexed_foreign_keys.

-- Gestionale tables
CREATE INDEX idx_client_notes_client_id ON public.client_notes (client_id);
CREATE INDEX idx_client_tasks_client_id ON public.client_tasks (client_id);
CREATE INDEX idx_expenses_client_id ON public.expenses (client_id);
CREATE INDEX idx_expenses_project_id ON public.expenses (project_id);
CREATE INDEX idx_payments_client_id ON public.payments (client_id);
CREATE INDEX idx_payments_project_id ON public.payments (project_id);
CREATE INDEX idx_payments_quote_id ON public.payments (quote_id);
CREATE INDEX idx_quotes_client_id ON public.quotes (client_id);
CREATE INDEX idx_services_project_id ON public.services (project_id);

-- Atomic CRM tables
CREATE INDEX idx_companies_sales_id ON public.companies (sales_id);
CREATE INDEX idx_contacts_company_id ON public.contacts (company_id);
CREATE INDEX idx_contacts_sales_id ON public.contacts (sales_id);
CREATE INDEX idx_contact_notes_contact_id ON public.contact_notes (contact_id);
CREATE INDEX idx_contact_notes_sales_id ON public.contact_notes (sales_id);
CREATE INDEX idx_deal_notes_deal_id ON public.deal_notes (deal_id);
CREATE INDEX idx_deal_notes_sales_id ON public.deal_notes (sales_id);
CREATE INDEX idx_deals_company_id ON public.deals (company_id);
CREATE INDEX idx_deals_sales_id ON public.deals (sales_id);
CREATE INDEX idx_tasks_contact_id ON public.tasks (contact_id);
