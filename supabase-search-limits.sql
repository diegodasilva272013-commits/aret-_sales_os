-- ============================================================
-- MIGRACIÓN: Límites de búsqueda + fix constraint plan
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- 0. Fix constraint: permitir 'agency' además de 'enterprise'
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check CHECK (plan IN ('free', 'pro', 'enterprise', 'agency'));

-- 1. Agregar columnas de búsquedas
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS searches_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_limit integer NOT NULL DEFAULT 50;

-- 2. Actualizar search_limit según plan actual
UPDATE organizations SET search_limit = 50 WHERE plan = 'free';
UPDATE organizations SET search_limit = 200 WHERE plan = 'pro';
UPDATE organizations SET search_limit = 999 WHERE plan IN ('agency', 'enterprise');

-- 3. Tu org (creador): plan agency con límites máximos
UPDATE organizations SET plan = 'agency', plan_limit = 99999, search_limit = 99999 WHERE id = '41bb4817-72d1-4bf4-89d3-029b094bce39';

-- 4. Función para incrementar búsquedas usadas
CREATE OR REPLACE FUNCTION public.increment_searches_used(org_id uuid)
RETURNS void AS $$
  UPDATE public.organizations SET searches_used = searches_used + 1 WHERE id = org_id;
$$ LANGUAGE sql SECURITY DEFINER;
