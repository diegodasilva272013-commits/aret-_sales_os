-- Tokens de Google Calendar del closer (owner de la org)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMPTZ;

-- Llamadas agendadas
CREATE TABLE IF NOT EXISTS scheduled_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  setter_id UUID REFERENCES profiles(id),
  closer_id UUID REFERENCES profiles(id),
  google_event_id TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can see calls" ON scheduled_calls FOR ALL USING (true);
