-- ============================================================
-- MIGRACIÓN: Proyectos + Log de Actividad
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tabla de proyectos
CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  color text DEFAULT '#6c63ff',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Miembros de proyectos (many-to-many)
CREATE TABLE IF NOT EXISTS project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'setter' CHECK (role IN ('setter', 'closer', 'admin')),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- 3. Log de actividad
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 4. Agregar project_id a prospects y businesses
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- 5. RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policies para projects
CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Policies para project_members
CREATE POLICY "project_members_select" ON project_members FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "project_members_insert" ON project_members FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "project_members_delete" ON project_members FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

-- Policies para activity_log  
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_org ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_project ON prospects(project_id);
CREATE INDEX IF NOT EXISTS idx_businesses_project ON businesses(project_id);
