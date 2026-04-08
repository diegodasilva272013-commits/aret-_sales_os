-- =====================================================
-- Areté Sales OS — LinkedIn Autonomous Agent Module
-- Tables: agent_config, agent_linkedin_accounts,
--         agent_queue, agent_logs
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. agent_config: configuración del agente por organización
CREATE TABLE IF NOT EXISTS agent_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  is_active BOOLEAN DEFAULT false,

  -- ICP (Ideal Customer Profile)
  icp_industries TEXT[] DEFAULT '{}',
  icp_roles TEXT[] DEFAULT '{}',
  icp_company_size TEXT DEFAULT '10-200',
  icp_locations TEXT[] DEFAULT '{}',
  icp_keywords TEXT[] DEFAULT '{}',

  -- Límites anti-ban (por cuenta LinkedIn)
  daily_connection_limit INT DEFAULT 15,
  daily_comment_limit INT DEFAULT 4,
  daily_like_limit INT DEFAULT 30,
  delay_min_seconds INT DEFAULT 120,
  delay_max_seconds INT DEFAULT 480,
  active_hours_start INT DEFAULT 9,
  active_hours_end INT DEFAULT 18,
  active_days INT[] DEFAULT '{1,2,3,4,5}',

  -- Secuencia de calentamiento (días)
  warming_days INT DEFAULT 7,
  commenting_days INT DEFAULT 7,
  nurturing_days INT DEFAULT 7,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- 2. agent_linkedin_accounts: cuentas LinkedIn conectadas
CREATE TABLE IF NOT EXISTS agent_linkedin_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  linkedin_email TEXT NOT NULL,
  session_cookie TEXT,
  status TEXT DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'active', 'warming', 'banned', 'paused')),
  daily_connections_used INT DEFAULT 0,
  daily_comments_used INT DEFAULT 0,
  last_action_at TIMESTAMPTZ,
  banned_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. agent_queue: cola de prospectos con su estado en la secuencia
CREATE TABLE IF NOT EXISTS agent_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES agent_linkedin_accounts(id),
  prospect_id UUID REFERENCES prospects(id),

  -- Datos del prospecto descubierto
  linkedin_url TEXT NOT NULL,
  full_name TEXT,
  headline TEXT,
  company TEXT,
  location TEXT,
  profile_data JSONB,

  -- Análisis IA
  disc_type TEXT,
  pain_points TEXT[],
  sales_angle TEXT,
  fit_score INT,

  -- Estado en la secuencia
  status TEXT DEFAULT 'discovered'
    CHECK (status IN (
      'discovered', 'warming', 'commenting', 'connecting',
      'connected', 'nurturing', 'messaged', 'responded',
      'converted', 'paused', 'failed', 'skipped'
    )),

  -- Timing
  started_at TIMESTAMPTZ,
  current_stage_started_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  messaged_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,

  -- Control
  retry_count INT DEFAULT 0,
  skip_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. agent_logs: log de cada acción ejecutada
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  queue_id UUID REFERENCES agent_queue(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES agent_linkedin_accounts(id),

  action_type TEXT NOT NULL
    CHECK (action_type IN (
      'profile_view', 'post_like', 'post_comment',
      'connection_request', 'connection_accepted',
      'direct_message', 'profile_discovered',
      'stage_changed', 'error'
    )),

  action_detail TEXT,
  generated_content TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INT
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_agent_queue_org_status
  ON agent_queue(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_queue_next_action
  ON agent_queue(next_action_at) WHERE status NOT IN ('converted','failed','skipped','paused');
CREATE INDEX IF NOT EXISTS idx_agent_logs_queue
  ON agent_logs(queue_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_org_executed
  ON agent_logs(organization_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_accounts_org
  ON agent_linkedin_accounts(organization_id);

-- 6. RLS Policies
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_linkedin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_agent_config" ON agent_config
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "org_members_agent_accounts" ON agent_linkedin_accounts
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "org_members_agent_queue" ON agent_queue
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "org_members_agent_logs" ON agent_logs
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- 7. Daily counter reset function (run via cron or scheduled function)
CREATE OR REPLACE FUNCTION reset_agent_daily_counters()
RETURNS void AS $$
  UPDATE agent_linkedin_accounts
  SET daily_connections_used = 0, daily_comments_used = 0;
$$ LANGUAGE sql SECURITY DEFINER;
