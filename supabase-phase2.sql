-- ============================================================
-- FASE 2: Stripe + Notas + Templates de mensajes
-- ============================================================

-- 1. Stripe fields en organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- 2. Notas en prospects
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Templates de mensajes en organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS message_tone TEXT DEFAULT 'profesional',
  ADD COLUMN IF NOT EXISTS message_style TEXT DEFAULT 'directo y conciso',
  ADD COLUMN IF NOT EXISTS custom_instructions TEXT;

-- 4. Planes disponibles (para referencia)
-- free:    50 análisis,  1 setter,  $0/mes   → price_id: price_free
-- pro:    200 análisis,  5 setters, $49/mes  → price_id: en Stripe
-- agency: 999 análisis, 99 setters, $150/mes  → price_id: en Stripe

-- Función para actualizar plan desde webhook de Stripe
CREATE OR REPLACE FUNCTION update_org_plan(
  p_stripe_customer_id TEXT,
  p_plan TEXT,
  p_plan_limit INT,
  p_setter_limit INT
)
RETURNS void AS $$
BEGIN
  UPDATE organizations
  SET
    plan = p_plan,
    plan_limit = p_plan_limit,
    analyses_used = 0  -- reset al renovar
  WHERE stripe_customer_id = p_stripe_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
