-- Add index column to quotes for Kanban board ordering
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS "index" SMALLINT DEFAULT 0;
