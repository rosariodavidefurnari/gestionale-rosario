-- A5 + B8: Date range consistency checks

-- Projects: end_date >= start_date (when both are set)
ALTER TABLE public.projects
ADD CONSTRAINT chk_project_date_range
CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

-- Quotes: response_date >= sent_date (when both are set)
ALTER TABLE public.quotes
ADD CONSTRAINT chk_quote_date_range
CHECK (response_date IS NULL OR sent_date IS NULL OR response_date >= sent_date);
