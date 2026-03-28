-- =============================================
-- MIGRACIÓN: Soporte Instagram en prospects
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Agregar columnas para Instagram y source_type
alter table public.prospects
  add column if not exists source_type text not null default 'linkedin' check (source_type in ('linkedin', 'instagram')),
  add column if not exists instagram_url text;

-- Hacer linkedin_url nullable (ya que ahora puede ser instagram)
alter table public.prospects
  alter column linkedin_url drop not null;

-- Unique constraint en instagram_url
create unique index if not exists prospects_instagram_url_unique
  on public.prospects (instagram_url)
  where instagram_url is not null;
