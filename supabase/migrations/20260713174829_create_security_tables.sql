/*
# Create security incident tracking and network monitoring tables

1. New Tables
- `security_incidents`
  - `id` (uuid, primary key)
  - `title` (text, not null) - incident title
  - `severity` (text, not null) - low/medium/high/critical
  - `status` (text, not null) - open/investigating/contained/resolved
  - `description` (text) - detailed description
  - `affected_systems` (text) - comma-separated list
  - `assigned_to` (text) - responder name
  - `team_mode` (text, default 'blue') - which team mode
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

- `network_logs`
  - `id` (uuid, primary key)
  - `source_ip` (text, not null)
  - `dest_ip` (text, not null)
  - `port` (integer)
  - `protocol` (text) - TCP/UDP/ICMP
  - `action` (text) - allowed/blocked/flagged
  - `threat_level` (text) - none/low/medium/high
  - `notes` (text)
  - `created_at` (timestamptz)

- `threat_intel`
  - `id` (uuid, primary key)
  - `indicator` (text, not null) - IP, domain, or hash
  - `indicator_type` (text) - ip/domain/hash/url
  - `reputation` (text) - clean/suspicious/malicious/unknown
  - `source` (text) - where the intel came from
  - `details` (text) - additional context
  - `created_at` (timestamptz)

- `firewall_rules`
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `action` (text, not null) - allow/drop/reject
  - `protocol` (text) - tcp/udp/any
  - `source_ip` (text)
  - `source_port` (text)
  - `dest_ip` (text)
  - `dest_port` (text)
  - `direction` (text) - inbound/outbound
  - `enabled` (boolean, default true)
  - `created_at` (timestamptz)

- `audit_checklists`
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `category` (text) - network/system/web/app
  - `items` (jsonb) - array of {text, checked}
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on all tables.
- Single-tenant app (no sign-in), so anon + authenticated can CRUD.
*/

CREATE TABLE IF NOT EXISTS security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  description text DEFAULT '',
  affected_systems text DEFAULT '',
  assigned_to text DEFAULT '',
  team_mode text NOT NULL DEFAULT 'blue',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_incidents" ON security_incidents;
CREATE POLICY "anon_select_incidents" ON security_incidents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_incidents" ON security_incidents;
CREATE POLICY "anon_insert_incidents" ON security_incidents FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_incidents" ON security_incidents;
CREATE POLICY "anon_update_incidents" ON security_incidents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_incidents" ON security_incidents;
CREATE POLICY "anon_delete_incidents" ON security_incidents FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS network_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ip text NOT NULL,
  dest_ip text NOT NULL,
  port integer DEFAULT 0,
  protocol text DEFAULT 'TCP',
  action text NOT NULL DEFAULT 'allowed',
  threat_level text DEFAULT 'none',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE network_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_logs" ON network_logs;
CREATE POLICY "anon_select_logs" ON network_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_logs" ON network_logs;
CREATE POLICY "anon_insert_logs" ON network_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_logs" ON network_logs;
CREATE POLICY "anon_update_logs" ON network_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_logs" ON network_logs;
CREATE POLICY "anon_delete_logs" ON network_logs FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS threat_intel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator text NOT NULL,
  indicator_type text NOT NULL DEFAULT 'ip',
  reputation text NOT NULL DEFAULT 'unknown',
  source text DEFAULT '',
  details text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE threat_intel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_threatintel" ON threat_intel;
CREATE POLICY "anon_select_threatintel" ON threat_intel FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_threatintel" ON threat_intel;
CREATE POLICY "anon_insert_threatintel" ON threat_intel FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_threatintel" ON threat_intel;
CREATE POLICY "anon_update_threatintel" ON threat_intel FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_threatintel" ON threat_intel;
CREATE POLICY "anon_delete_threatintel" ON threat_intel FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS firewall_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  action text NOT NULL DEFAULT 'allow',
  protocol text DEFAULT 'tcp',
  source_ip text DEFAULT 'any',
  source_port text DEFAULT 'any',
  dest_ip text DEFAULT 'any',
  dest_port text DEFAULT 'any',
  direction text NOT NULL DEFAULT 'inbound',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE firewall_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_firewall" ON firewall_rules;
CREATE POLICY "anon_select_firewall" ON firewall_rules FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_firewall" ON firewall_rules;
CREATE POLICY "anon_insert_firewall" ON firewall_rules FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_firewall" ON firewall_rules;
CREATE POLICY "anon_update_firewall" ON firewall_rules FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_firewall" ON firewall_rules;
CREATE POLICY "anon_delete_firewall" ON firewall_rules FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS audit_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'system',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE audit_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_audit" ON audit_checklists;
CREATE POLICY "anon_select_audit" ON audit_checklists FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_audit" ON audit_checklists;
CREATE POLICY "anon_insert_audit" ON audit_checklists FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_audit" ON audit_checklists;
CREATE POLICY "anon_update_audit" ON audit_checklists FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_audit" ON audit_checklists;
CREATE POLICY "anon_delete_audit" ON audit_checklists FOR DELETE
  TO anon, authenticated USING (true);
