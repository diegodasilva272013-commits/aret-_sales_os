-- =====================================================
-- Areté Sales OS - Director Module Tables
-- Run this migration to add director/operations tables
-- =====================================================

-- Reportes diarios de setters
CREATE TABLE IF NOT EXISTS reportes_setter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  proyecto_id UUID,
  leads_nuevos INT DEFAULT 0,
  intentos_contacto INT DEFAULT 0,
  contactos_efectivos INT DEFAULT 0,
  citas_agendadas INT DEFAULT 0,
  citas_show INT DEFAULT 0,
  citas_no_show INT DEFAULT 0,
  citas_calificadas INT DEFAULT 0,
  mensajes_enviados INT DEFAULT 0,
  respuestas_recibidas INT DEFAULT 0,
  asistio_reunion BOOLEAN DEFAULT FALSE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, fecha, proyecto_id)
);

-- Reportes diarios de closers
CREATE TABLE IF NOT EXISTS reportes_closer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  proyecto_id UUID,
  citas_tomadas INT DEFAULT 0,
  shows INT DEFAULT 0,
  ventas_cerradas INT DEFAULT 0,
  monto_cerrado DECIMAL(12,2) DEFAULT 0,
  monto_cobrado DECIMAL(12,2) DEFAULT 0,
  propuestas_enviadas INT DEFAULT 0,
  seguimientos_realizados INT DEFAULT 0,
  motivo_no_cierre TEXT,
  tipo_pago TEXT DEFAULT 'completo',
  asistio_reunion BOOLEAN DEFAULT FALSE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, fecha, proyecto_id)
);

-- Proyectos del director
CREATE TABLE IF NOT EXISTS director_proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  empresa TEXT,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  tipo TEXT DEFAULT 'evergreen' CHECK (tipo IN ('evergreen', 'lanzamiento')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Miembros de proyectos
CREATE TABLE IF NOT EXISTS director_proyecto_miembros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES director_proyectos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rol TEXT DEFAULT 'setter',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proyecto_id, user_id)
);

-- Configuración de comisiones por proyecto
CREATE TABLE IF NOT EXISTS director_comisiones_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES director_proyectos(id) ON DELETE CASCADE,
  setter_base_mensual DECIMAL(12,2) DEFAULT 500,
  setter_por_cita_show_calificada DECIMAL(12,2) DEFAULT 25,
  setter_por_venta_cerrada DECIMAL(12,2) DEFAULT 75,
  closer_comision_porcentaje DECIMAL(5,2) DEFAULT 8,
  closer_bonus_cierre DECIMAL(12,2) DEFAULT 500,
  closer_bonus_tasa_minima DECIMAL(5,2) DEFAULT 40,
  closer_penalidad_impago_porcentaje DECIMAL(5,2) DEFAULT 50,
  closer_dias_penalidad INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proyecto_id)
);

-- Tareas / Agenda del director
CREATE TABLE IF NOT EXISTS director_tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT DEFAULT 'tarea' CHECK (tipo IN ('tarea', 'reunion', 'recordatorio', 'llamada')),
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'cancelada')),
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  todo_el_dia BOOLEAN DEFAULT FALSE,
  recurrencia TEXT,
  participantes UUID[],
  link_reunion TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adjuntos de tareas
CREATE TABLE IF NOT EXISTS director_tarea_adjuntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES director_tareas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT,
  size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes / Cartera
CREATE TABLE IF NOT EXISTS clientes_cartera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nombre_cliente TEXT NOT NULL,
  documento TEXT,
  closer_id UUID REFERENCES auth.users(id),
  setter_id UUID REFERENCES auth.users(id),
  monto_referencia DECIMAL(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'vencido', 'pagado')),
  notas TEXT,
  fuente TEXT,
  campana TEXT,
  canal TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Cuotas de clientes
CREATE TABLE IF NOT EXISTS cuotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes_cartera(id) ON DELETE CASCADE,
  monto DECIMAL(12,2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'vencida')),
  fecha_pago TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transacciones financieras
CREATE TABLE IF NOT EXISTS director_transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes_cartera(id),
  cuota_id UUID REFERENCES cuotas(id),
  monto DECIMAL(12,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'reembolso')),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metas mensuales de facturación
CREATE TABLE IF NOT EXISTS director_metas_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mes TEXT NOT NULL, -- format: YYYY-MM-01
  meta_objetivo DECIMAL(12,2) DEFAULT 0,
  costos_ads DECIMAL(12,2) DEFAULT 0,
  costos_operativos DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, mes)
);

-- Reglas de comisión (facturación)
CREATE TABLE IF NOT EXISTS director_reglas_comision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'closer',
  activa BOOLEAN DEFAULT TRUE,
  tramos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Métodos de pago de miembros del equipo
CREATE TABLE IF NOT EXISTS director_metodos_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'cbu',
  datos TEXT NOT NULL,
  titular TEXT,
  principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración de calendario
CREATE TABLE IF NOT EXISTS director_calendario_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hora_inicio TEXT DEFAULT '08:00',
  hora_fin TEXT DEFAULT '20:00',
  dias_laborales TEXT[] DEFAULT ARRAY['lunes','martes','miercoles','jueves','viernes'],
  zona_horaria TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- =====================================================
-- Row Level Security Policies
-- =====================================================
ALTER TABLE reportes_setter ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_closer ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_proyecto_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_comisiones_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_tarea_adjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_cartera ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_metas_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_reglas_comision ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_metodos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_calendario_config ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's org
CREATE OR REPLACE FUNCTION get_user_org_id() RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS: Users can only access data from their own organization
CREATE POLICY "org_access" ON reportes_setter FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_access" ON reportes_closer FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_access" ON director_proyectos FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_access" ON director_tareas FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_access" ON clientes_cartera FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_access" ON director_transacciones FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_access" ON director_metas_mensuales FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_access" ON director_reglas_comision FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_access" ON director_metodos_pago FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_access" ON director_calendario_config FOR ALL USING (organization_id = get_user_org_id());

-- For join tables, access through parent
CREATE POLICY "org_access" ON director_proyecto_miembros FOR ALL
  USING (EXISTS (SELECT 1 FROM director_proyectos p WHERE p.id = proyecto_id AND p.organization_id = get_user_org_id()));
CREATE POLICY "org_access" ON director_comisiones_proyecto FOR ALL
  USING (EXISTS (SELECT 1 FROM director_proyectos p WHERE p.id = proyecto_id AND p.organization_id = get_user_org_id()));
CREATE POLICY "org_access" ON director_tarea_adjuntos FOR ALL
  USING (EXISTS (SELECT 1 FROM director_tareas t WHERE t.id = tarea_id AND t.organization_id = get_user_org_id()));
CREATE POLICY "org_access" ON cuotas FOR ALL
  USING (EXISTS (SELECT 1 FROM clientes_cartera c WHERE c.id = cliente_id AND c.organization_id = get_user_org_id()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reportes_setter_org_fecha ON reportes_setter(organization_id, fecha);
CREATE INDEX IF NOT EXISTS idx_reportes_closer_org_fecha ON reportes_closer(organization_id, fecha);
CREATE INDEX IF NOT EXISTS idx_director_proyectos_org ON director_proyectos(organization_id);
CREATE INDEX IF NOT EXISTS idx_director_tareas_org ON director_tareas(organization_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cartera_org ON clientes_cartera(organization_id);
CREATE INDEX IF NOT EXISTS idx_director_transacciones_org ON director_transacciones(organization_id);
