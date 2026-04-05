-- =============================================
-- WORKFLOWS AUTOMÁTICOS - Areté IA OS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Reglas de workflows (config por organización)
create table if not exists public.workflow_rules (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations on delete cascade not null,
  rule_key text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}',
  last_run_at timestamp with time zone,
  total_executions integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(organization_id, rule_key)
);

alter table public.workflow_rules enable row level security;

create policy "Org members can read workflow rules" on public.workflow_rules
  for select using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

create policy "Org owners can manage workflow rules" on public.workflow_rules
  for all using (
    organization_id in (select organization_id from public.profiles where id = auth.uid() and is_owner = true)
  );

-- Logs de ejecución
create table if not exists public.workflow_logs (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations on delete cascade not null,
  rule_key text not null,
  prospect_id uuid references public.prospects on delete set null,
  prospect_name text,
  action text not null,
  detail text,
  success boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workflow_logs enable row level security;

create policy "Org members can read workflow logs" on public.workflow_logs
  for select using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

create policy "System can insert workflow logs" on public.workflow_logs
  for insert with check (auth.role() = 'authenticated');

-- Index for performance
create index if not exists idx_workflow_logs_org_created on public.workflow_logs(organization_id, created_at desc);
create index if not exists idx_workflow_rules_org on public.workflow_rules(organization_id);

-- RPC function: increment workflow execution count
create or replace function public.increment_workflow_executions(
  p_org_id uuid,
  p_rule_key text,
  p_count integer default 1
)
returns void
language plpgsql
security definer
as $$
begin
  update public.workflow_rules
  set total_executions = total_executions + p_count,
      last_run_at = now(),
      updated_at = now()
  where organization_id = p_org_id
    and rule_key = p_rule_key;
end;
$$;
