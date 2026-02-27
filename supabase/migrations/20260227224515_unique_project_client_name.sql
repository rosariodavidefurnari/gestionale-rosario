-- B6: Prevent duplicate project names per client
ALTER TABLE public.projects
ADD CONSTRAINT projects_client_name_unique UNIQUE (client_id, name);
