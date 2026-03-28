-- Audio notes en prospects
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Bucket para audios de notas
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-notes', 'audio-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: usuarios autenticados pueden subir sus audios
CREATE POLICY "Authenticated users can upload audio notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-notes');

-- Policy: todos pueden leer (para reproducir)
CREATE POLICY "Anyone can read audio notes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-notes');

-- Policy: usuarios autenticados pueden borrar sus audios
CREATE POLICY "Authenticated users can delete audio notes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-notes');
