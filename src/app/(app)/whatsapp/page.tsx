/*
  ============================================================
  SQL to run in Supabase before using this module:
  ============================================================

  -- WhatsApp lines (phone numbers / channels)
  CREATE TABLE IF NOT EXISTS wa_lines (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone         TEXT,
    label         TEXT,
    channel_type  TEXT NOT NULL DEFAULT 'baileys', -- 'baileys' | 'meta'
    status        TEXT NOT NULL DEFAULT 'cold',    -- 'cold' | 'warming' | 'ready' | 'banned'
    warmup_enabled BOOLEAN NOT NULL DEFAULT false,
    baileys_session TEXT,
    meta_phone_id  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE wa_lines ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "org members can manage wa_lines" ON wa_lines
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

  -- WhatsApp contacts (bulk send targets)
  CREATE TABLE IF NOT EXISTS wa_contacts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone         TEXT NOT NULL,
    name          TEXT,
    alias         TEXT,
    source        TEXT NOT NULL DEFAULT 'manual', -- 'csv' | 'manual' | 'crm'
    tags          TEXT[] DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE wa_contacts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "org members can manage wa_contacts" ON wa_contacts
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
  CREATE INDEX IF NOT EXISTS wa_contacts_org_idx ON wa_contacts(organization_id);

  -- WhatsApp campaigns
  CREATE TABLE IF NOT EXISTS wa_campaigns (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    line_id       UUID REFERENCES wa_lines(id) ON DELETE SET NULL,
    status        TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'running' | 'paused' | 'done'
    contact_ids   UUID[] DEFAULT '{}',
    variations    JSONB DEFAULT '[]', -- [{body: string, media_url?: string}]
    block_size    INT NOT NULL DEFAULT 30,
    pause_minutes INT NOT NULL DEFAULT 3,
    delay_seconds INT NOT NULL DEFAULT 15,
    randomize     BOOLEAN NOT NULL DEFAULT true,
    sent_count    INT NOT NULL DEFAULT 0,
    error_count   INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE wa_campaigns ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "org members can manage wa_campaigns" ON wa_campaigns
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

  -- Send queue
  CREATE TABLE IF NOT EXISTS wa_send_queue (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id   UUID NOT NULL REFERENCES wa_campaigns(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id    UUID REFERENCES wa_contacts(id) ON DELETE SET NULL,
    phone         TEXT NOT NULL,
    name          TEXT,
    variation_index INT NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'error' | 'skipped'
    error_msg     TEXT,
    sent_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE wa_send_queue ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "org members can manage wa_send_queue" ON wa_send_queue
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
  CREATE INDEX IF NOT EXISTS wa_send_queue_campaign_idx ON wa_send_queue(campaign_id);

  -- Enable realtime for monitor
  ALTER PUBLICATION supabase_realtime ADD TABLE wa_send_queue;
  ALTER PUBLICATION supabase_realtime ADD TABLE wa_campaigns;

  ============================================================
*/

import { redirect } from "next/navigation"

export default function WhatsAppPage() {
  redirect("/whatsapp/lines")
}
