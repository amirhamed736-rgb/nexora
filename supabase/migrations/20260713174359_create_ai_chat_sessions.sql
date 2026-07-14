/*
# Create AI chat sessions table

1. New Tables
- `ai_chat_sessions`
  - `id` (uuid, primary key)
  - `title` (text, not null) - session title/label
  - `team_mode` (text, default 'red') - which team mode was active (red/blue/purple)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `ai_chat_sessions`.
- This is a single-tenant app (no sign-in screen), so anon + authenticated can CRUD.
- All data is intentionally shared/public within the app.
*/

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  team_mode text NOT NULL DEFAULT 'red',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON ai_chat_sessions;
CREATE POLICY "anon_select_sessions" ON ai_chat_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON ai_chat_sessions;
CREATE POLICY "anon_insert_sessions" ON ai_chat_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON ai_chat_sessions;
CREATE POLICY "anon_update_sessions" ON ai_chat_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON ai_chat_sessions;
CREATE POLICY "anon_delete_sessions" ON ai_chat_sessions FOR DELETE
  TO anon, authenticated USING (true);
