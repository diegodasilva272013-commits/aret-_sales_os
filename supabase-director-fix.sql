-- =====================================================
-- Areté Sales OS - Director Module Fix
-- FIXES: profiles role constraint, missing columns,
-- audio_notas table, perfil columns
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Fix role CHECK constraint to allow 'closer', 'director', 'owner'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'setter', 'closer', 'director', 'owner'));

-- 2. Add missing columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Add perfil-specific columns (for /director/perfil page)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS horario_inicio TEXT DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS horario_fin TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS dias_trabajo TEXT[] DEFAULT ARRAY['lunes','martes','miercoles','jueves','viernes'],
  ADD COLUMN IF NOT EXISTS notas_perfil TEXT DEFAULT '';

-- 4. Audio Notas table (for AudioRecorder component)
CREATE TABLE IF NOT EXISTS audio_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo TEXT NOT NULL,
  entidad_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  duracion_segundos INT DEFAULT 0,
  titulo TEXT DEFAULT '',
  transcripcion TEXT DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audio_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_audio_notas" ON audio_notas
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_audio_notas_entidad
  ON audio_notas(entidad_tipo, entidad_id);

-- 5. Audio notas storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-notas', 'audio-notas', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_audio_notas" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio-notas');

CREATE POLICY "auth_read_audio_notas" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'audio-notas');

CREATE POLICY "auth_delete_audio_notas" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audio-notas');

-- 6. Ensure INSERT policy on profiles (for admin user creation)
-- The existing policy only allows SELECT and UPDATE.
-- Admin user creation uses service_role key which bypasses RLS,
-- but the auto-trigger also needs insert capability.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Service can insert profiles'
  ) THEN
    CREATE POLICY "Service can insert profiles" ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;
