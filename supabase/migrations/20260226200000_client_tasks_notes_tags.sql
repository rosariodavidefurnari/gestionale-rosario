-- Migration: client_tasks, client_notes, tags on clients
-- Purpose: Support tasks (promemoria), notes, and tags linked to gestionale clients

-- 1. Client tasks (promemoria) — optionally linked to a client
CREATE TABLE client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'none',
  due_date TIMESTAMPTZ NOT NULL,
  done_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_client_tasks" ON client_tasks
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 2. Client notes — always linked to a client, supports attachments
CREATE TABLE client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  attachments JSONB[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_client_notes" ON client_notes
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. Tags field on clients (array of tag IDs, reuses existing tags table)
ALTER TABLE clients ADD COLUMN tags BIGINT[] DEFAULT '{}';
