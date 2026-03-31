-- Agregar soporte de media (audio, imagen, video) a whatsapp_messages
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS media_type TEXT; -- 'audio', 'image', 'video', 'document'

-- Bucket de storage para media de WhatsApp
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Política para que cualquier autenticado pueda subir
CREATE POLICY "Auth users can upload whatsapp media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

-- Política para que cualquiera pueda leer (URLs públicas)
CREATE POLICY "Public read whatsapp media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'whatsapp-media');

-- Service role puede hacer todo (para el webhook)
CREATE POLICY "Service role full access whatsapp media"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'whatsapp-media');
