-- =============================================
-- FASE 1: Multi-tenant + Onboarding
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Organizations (sin policies todavía)
create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique,
  company_description text default '',
  product_service text default '',
  target_audience text default '',
  value_proposition text default '',
  website text default '',
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  analyses_used integer not null default 0,
  plan_limit integer not null default 50,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.organizations enable row level security;

-- Permitir insert a usuarios autenticados (para onboarding)
create policy "Authenticated can insert org" on public.organizations
  for insert with check (auth.role() = 'authenticated');

-- 2. Agregar columnas a profiles PRIMERO (antes de policies que las referencian)
alter table public.profiles
  add column if not exists organization_id uuid references public.organizations,
  add column if not exists is_owner boolean not null default false;

-- 3. Ahora sí las policies de organizations que usan profiles.organization_id
create policy "Org members can read their org" on public.organizations
  for select using (
    id in (select organization_id from public.profiles where id = auth.uid())
  );

create policy "Org owners can update their org" on public.organizations
  for update using (
    id in (select organization_id from public.profiles where id = auth.uid() and is_owner = true)
  );

-- 4. Agregar org a prospects
alter table public.prospects
  add column if not exists organization_id uuid references public.organizations;

-- 5. Agregar org a businesses
alter table public.businesses
  add column if not exists organization_id uuid references public.organizations;

-- 6. Actualizar RLS prospects
drop policy if exists "Authenticated users can manage prospects" on public.prospects;
create policy "Org members can manage prospects" on public.prospects
  for all using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
    or organization_id is null
  );

-- 7. Actualizar RLS businesses
drop policy if exists "Authenticated users can manage businesses" on public.businesses;
create policy "Org members can manage businesses" on public.businesses
  for all using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
    or organization_id is null
  );

-- 8. Función para incrementar análisis usados
create or replace function public.increment_analyses_used(org_id uuid)
returns void as $$
  update public.organizations set analyses_used = analyses_used + 1 where id = org_id;
$$ language sql security definer;
