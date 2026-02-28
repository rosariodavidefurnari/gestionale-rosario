ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_project_id
  ON public.quotes(project_id);
