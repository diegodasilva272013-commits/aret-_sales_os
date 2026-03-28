-- =============================================
-- MÉTRICAS DE CLOSERS - Schema
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Tabla principal de métricas
create table if not exists public.closer_metrics (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  closer_id uuid references public.profiles(id) on delete cascade not null,
  fecha date not null default current_date,

  -- Métricas de actividad
  leads_asignados integer not null default 0,
  leads_contactados integer not null default 0,
  respuestas_obtenidas integer not null default 0,
  llamadas_realizadas integer not null default 0,
  conversaciones_efectivas integer not null default 0,

  -- Métricas de reuniones
  reuniones_agendadas integer not null default 0,
  reuniones_realizadas integer not null default 0,

  -- Métricas de ventas
  ofertas_enviadas integer not null default 0,
  ventas_cerradas integer not null default 0,
  monto_vendido numeric(12,2) not null default 0,
  cobrado numeric(12,2) not null default 0,

  -- Seguimiento
  seguimientos_pendientes integer not null default 0,

  -- Texto libre
  objeciones_principales text default '',
  motivo_no_cierre text default '',
  observaciones text default '',

  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Un registro por closer por día
  unique(closer_id, fecha)
);

-- 2. Índices
create index if not exists idx_closer_metrics_org on closer_metrics(organization_id);
create index if not exists idx_closer_metrics_closer on closer_metrics(closer_id);
create index if not exists idx_closer_metrics_fecha on closer_metrics(fecha desc);
create index if not exists idx_closer_metrics_org_fecha on closer_metrics(organization_id, fecha desc);

-- 3. RLS
alter table public.closer_metrics enable row level security;

-- Closers pueden ver y editar sus propias métricas
create policy "closer_own_metrics_select" on public.closer_metrics
  for select using (
    closer_id = auth.uid()
    or organization_id in (
      select organization_id from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "closer_own_metrics_insert" on public.closer_metrics
  for insert with check (
    closer_id = auth.uid()
    or organization_id in (
      select organization_id from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "closer_own_metrics_update" on public.closer_metrics
  for update using (
    closer_id = auth.uid()
    or organization_id in (
      select organization_id from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "closer_own_metrics_delete" on public.closer_metrics
  for delete using (
    closer_id = auth.uid()
    or organization_id in (
      select organization_id from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Trigger updated_at
create or replace function update_closer_metrics_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger closer_metrics_updated_at
  before update on closer_metrics
  for each row execute function update_closer_metrics_updated_at();

-- 5. Vista de métricas con campos calculados (opcional, para queries directas)
create or replace view closer_metrics_calculated as
select
  cm.*,
  p.full_name as closer_name,
  p.email as closer_email,
  -- Porcentajes calculados
  case when cm.leads_asignados > 0
    then round((cm.leads_contactados::numeric / cm.leads_asignados) * 100, 1)
    else 0 end as pct_contacto,
  case when cm.leads_contactados > 0
    then round((cm.respuestas_obtenidas::numeric / cm.leads_contactados) * 100, 1)
    else 0 end as pct_respuesta,
  case when cm.reuniones_agendadas > 0
    then round((cm.reuniones_realizadas::numeric / cm.reuniones_agendadas) * 100, 1)
    else 0 end as pct_show_rate,
  case when cm.reuniones_realizadas > 0
    then round((cm.ventas_cerradas::numeric / cm.reuniones_realizadas) * 100, 1)
    else 0 end as pct_cierre,
  case when cm.leads_asignados > 0
    then round((cm.ventas_cerradas::numeric / cm.leads_asignados) * 100, 1)
    else 0 end as pct_conversion_total,
  case when cm.ventas_cerradas > 0
    then round(cm.monto_vendido / cm.ventas_cerradas, 2)
    else 0 end as ticket_promedio
from closer_metrics cm
join profiles p on p.id = cm.closer_id;
