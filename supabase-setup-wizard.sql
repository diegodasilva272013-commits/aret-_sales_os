-- Setup Wizard: agregar columna setup_completed a organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_completed boolean DEFAULT false;

-- Marcar orgs existentes como completadas (ya están configuradas)
UPDATE organizations SET setup_completed = true WHERE setup_completed IS NULL OR setup_completed = false;
