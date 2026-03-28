-- Campo para trackear última notificación enviada por setter
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMPTZ;
