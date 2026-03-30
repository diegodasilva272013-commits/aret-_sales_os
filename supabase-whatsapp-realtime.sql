-- =============================================
-- WhatsApp: Habilitar Realtime + RLS SELECT
-- =============================================

-- 1. Habilitar Realtime para la tabla whatsapp_messages
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- 2. Asegurar que RLS esté habilitado
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- 3. Policy para que usuarios autenticados de la org puedan leer mensajes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_messages' AND policyname = 'whatsapp_messages_select_org'
  ) THEN
    CREATE POLICY whatsapp_messages_select_org ON whatsapp_messages
      FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- 4. Policy para que usuarios autenticados de la org puedan insertar mensajes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_messages' AND policyname = 'whatsapp_messages_insert_org'
  ) THEN
    CREATE POLICY whatsapp_messages_insert_org ON whatsapp_messages
      FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- 5. Policy para service_role (webhook) - puede hacer todo
-- (service_role ya bypasea RLS por defecto, pero por si acaso)
