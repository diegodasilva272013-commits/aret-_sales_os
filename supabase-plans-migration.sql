-- =====================================================
-- Areté Sales OS — Plan Migration to New Tiers
-- FROM: Free ($0) / Pro ($49) / Agency ($150)
-- TO:   Free ($0) / Starter ($397) / Pro ($797) / Agency ($1.497)
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Update plan CHECK constraint to allow 'starter'
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('free', 'starter', 'pro', 'agency', 'enterprise'));

-- 2. Update default plan_limit for free plan (was 50, now 10)
ALTER TABLE public.organizations ALTER COLUMN plan_limit SET DEFAULT 10;

-- 3. Update default search_limit for free plan (was 50, now 20)
ALTER TABLE public.organizations ALTER COLUMN search_limit SET DEFAULT 20;

-- 4. Add new limit tracking columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS seats_limit INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS prospects_limit INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS prospects_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_limit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voip_limit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voip_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_limit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_used INTEGER NOT NULL DEFAULT 0;

-- 5. Migrate existing orgs on 'pro' to 'starter' (same price bracket) 
-- and update their limits
UPDATE public.organizations SET
  plan = 'starter',
  plan_limit = 300,
  search_limit = 500,
  seats_limit = 3,
  prospects_limit = 500,
  whatsapp_limit = 500,
  voip_limit = 60,
  agent_limit = 200
WHERE plan = 'pro';

-- 6. Update existing orgs on 'agency' or 'enterprise'
UPDATE public.organizations SET
  plan_limit = 5000,
  search_limit = 99999,
  seats_limit = 0,
  prospects_limit = 0,
  whatsapp_limit = 0,
  voip_limit = 1500,
  agent_limit = 3000
WHERE plan IN ('agency', 'enterprise');

-- 7. Update existing free orgs to new limits
UPDATE public.organizations SET
  plan_limit = 10,
  search_limit = 20,
  seats_limit = 1,
  prospects_limit = 20,
  whatsapp_limit = 0,
  voip_limit = 0,
  agent_limit = 0
WHERE plan = 'free';

-- 8. Increment functions for new counters
CREATE OR REPLACE FUNCTION increment_whatsapp_used(org_id uuid)
RETURNS void AS $$
  UPDATE public.organizations
  SET whatsapp_used = whatsapp_used + 1
  WHERE id = org_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_voip_used(org_id uuid, minutes int DEFAULT 1)
RETURNS void AS $$
  UPDATE public.organizations
  SET voip_used = voip_used + minutes
  WHERE id = org_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_agent_used(org_id uuid)
RETURNS void AS $$
  UPDATE public.organizations
  SET agent_used = agent_used + 1
  WHERE id = org_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_prospects_used(org_id uuid)
RETURNS void AS $$
  UPDATE public.organizations
  SET prospects_used = prospects_used + 1
  WHERE id = org_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 9. Reset all counters function (called on billing cycle)
CREATE OR REPLACE FUNCTION reset_monthly_counters(org_id uuid)
RETURNS void AS $$
  UPDATE public.organizations
  SET analyses_used = 0,
      searches_used = 0,
      whatsapp_used = 0,
      voip_used = 0,
      agent_used = 0,
      prospects_used = 0
  WHERE id = org_id;
$$ LANGUAGE sql SECURITY DEFINER;
