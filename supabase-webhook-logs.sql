-- Tabla para loguear todos los requests al webhook de WhatsApp
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method text,
  body jsonb,
  headers jsonb,
  created_at timestamptz DEFAULT now()
);

-- Sin RLS para que el service_role pueda escribir sin problemas
ALTER TABLE webhook_logs DISABLE ROW LEVEL SECURITY;
