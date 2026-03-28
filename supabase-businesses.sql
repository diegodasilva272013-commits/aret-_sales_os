-- =============================================
-- ARETE PROSPECTOR - Módulo Businesses
-- Ejecutar en Supabase SQL Editor
-- =============================================

create table public.businesses (
  id uuid default gen_random_uuid() primary key,
  -- Datos de Google Places
  place_id text unique,
  name text not null,
  category text default '',
  address text default '',
  city text default '',
  country text default '',
  phone text default '',
  website text default '',
  google_rating numeric(2,1),
  google_maps_url text default '',
  -- Datos enriquecidos por IA
  contact_name text default '',
  contact_email text default '',
  whatsapp text default '',
  instagram text default '',
  linkedin_url text default '',
  -- Estado
  status text not null default 'nuevo' check (status in ('nuevo', 'activo', 'pausado', 'llamada_agendada', 'cerrado_ganado', 'cerrado_perdido')),
  follow_up_count integer not null default 0,
  last_contact_at timestamp with time zone,
  assigned_to uuid references public.profiles not null,
  created_by uuid references public.profiles not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.businesses enable row level security;
create policy "Authenticated users can manage businesses" on public.businesses
  for all using (auth.role() = 'authenticated');

create table public.business_analyses (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses on delete cascade not null,
  company_analysis text default '',
  psychological_profile text default '',
  communication_style text default '',
  pain_points text[] default '{}',
  sales_angle text default '',
  key_words text[] default '{}',
  raw_data text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.business_analyses enable row level security;
create policy "Authenticated users can manage business_analyses" on public.business_analyses
  for all using (auth.role() = 'authenticated');

create table public.business_messages (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses on delete cascade not null,
  follow_up_number integer not null,
  channel text not null check (channel in ('whatsapp', 'email', 'instagram', 'linkedin', 'general')),
  message_type text not null check (message_type in ('inicial', 'sin_respuesta', 'con_respuesta')),
  subject text default '',
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.business_messages enable row level security;
create policy "Authenticated users can manage business_messages" on public.business_messages
  for all using (auth.role() = 'authenticated');

create table public.business_follow_ups (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses on delete cascade not null,
  follow_up_number integer not null,
  channel text not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'enviado', 'respondido', 'sin_respuesta')),
  prospect_responded boolean not null default false,
  notes text,
  sent_at timestamp with time zone,
  setter_id uuid references public.profiles not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.business_follow_ups enable row level security;
create policy "Authenticated users can manage business_follow_ups" on public.business_follow_ups
  for all using (auth.role() = 'authenticated');
