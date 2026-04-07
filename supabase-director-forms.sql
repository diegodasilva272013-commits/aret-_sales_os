-- =====================================================
-- Areté Sales OS - Director Forms Migration
-- Adds missing columns needed by SetterWizard & CloserWizard
-- Run this AFTER supabase-director.sql
-- =====================================================

-- ── reportes_setter: add missing columns ──
ALTER TABLE reportes_setter ADD COLUMN IF NOT EXISTS citas_reprogramadas INT DEFAULT 0;
ALTER TABLE reportes_setter ADD COLUMN IF NOT EXISTS motivos_noshow TEXT;
ALTER TABLE reportes_setter ADD COLUMN IF NOT EXISTS detalle_citas JSONB;
ALTER TABLE reportes_setter ADD COLUMN IF NOT EXISTS conversaciones_activas INT DEFAULT 0;
ALTER TABLE reportes_setter ADD COLUMN IF NOT EXISTS leads_calificados_chat INT DEFAULT 0;
ALTER TABLE reportes_setter ADD COLUMN IF NOT EXISTS llamadas_agendadas_dm INT DEFAULT 0;
ALTER TABLE reportes_setter ADD COLUMN IF NOT EXISTS nota_reunion TEXT;
ALTER TABLE reportes_setter ADD COLUMN IF NOT EXISTS tipo_proyecto TEXT DEFAULT 'evergreen';

-- ── reportes_closer: add missing columns ──
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS citas_show INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS citas_noshow INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS ventas_no_cerradas INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS pagos_completos INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS pagos_parciales INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS pagos_nulo INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS monto_pendiente DECIMAL(12,2) DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS detalle_ventas JSONB;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS motivo_precio INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS motivo_consultar INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS motivo_momento INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS motivo_competencia INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS motivo_otro INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS conversaciones_cerradas INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS tiempo_respuesta_avg INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS objeciones_resueltas INT DEFAULT 0;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS nota_reunion TEXT;
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS tipo_proyecto TEXT DEFAULT 'evergreen';
ALTER TABLE reportes_closer ADD COLUMN IF NOT EXISTS ticket_promedio DECIMAL(12,2) DEFAULT 0;

-- Rename citas_tomadas → keep but add alias view (citas_recibidas)
-- The wizard will write to citas_tomadas but the name maps to citas_recibidas in the UI
-- Also rename monto_cerrado column alias → both names acceptable, wizard writes to monto_cerrado directly

-- ── Storage bucket for comprobantes (closer payment proofs) ──
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprobantes', 'comprobantes', true) 
ON CONFLICT (id) DO NOTHING;

-- RLS for comprobantes bucket
CREATE POLICY "auth_upload_comprobantes" ON storage.objects FOR INSERT 
TO authenticated WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "public_read_comprobantes" ON storage.objects FOR SELECT 
TO public USING (bucket_id = 'comprobantes');
