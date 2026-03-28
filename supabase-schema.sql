-- =============================================
-- ARETE PROSPECTOR - Schema Supabase
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Profiles (setters)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  avatar_url text,
  role text not null default 'setter' check (role in ('admin', 'setter')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Prospects
create table public.prospects (
  id uuid default gen_random_uuid() primary key,
  linkedin_url text not null unique,
  full_name text not null default '',
  headline text default '',
  company text default '',
  location text default '',
  profile_image text,
  status text not null default 'nuevo' check (status in ('nuevo', 'activo', 'pausado', 'llamada_agendada', 'cerrado_ganado', 'cerrado_perdido')),
  phase text not null default 'contacto' check (phase in ('contacto', 'venta', 'cierre')),
  follow_up_count integer not null default 0,
  last_contact_at timestamp with time zone,
  assigned_to uuid references public.profiles not null,
  created_by uuid references public.profiles not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.prospects enable row level security;

create policy "Authenticated users can view all prospects" on public.prospects
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert prospects" on public.prospects
  for insert with check (auth.role() = 'authenticated');

create policy "Assigned setter or admin can update" on public.prospects
  for update using (auth.role() = 'authenticated');

-- Analyses
create table public.prospect_analyses (
  id uuid default gen_random_uuid() primary key,
  prospect_id uuid references public.prospects on delete cascade not null,
  psychological_profile text default '',
  disc_type text default '',
  communication_style text default '',
  key_words text[] default '{}',
  pain_points text[] default '{}',
  sales_angle text default '',
  company_analysis text default '',
  raw_linkedin_data text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.prospect_analyses enable row level security;

create policy "Authenticated users can manage analyses" on public.prospect_analyses
  for all using (auth.role() = 'authenticated');

-- Generated Messages
create table public.generated_messages (
  id uuid default gen_random_uuid() primary key,
  prospect_id uuid references public.prospects on delete cascade not null,
  follow_up_number integer not null,
  phase text not null check (phase in ('contacto', 'venta', 'cierre')),
  message_type text not null check (message_type in ('inicial', 'sin_respuesta', 'con_respuesta')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.generated_messages enable row level security;

create policy "Authenticated users can manage messages" on public.generated_messages
  for all using (auth.role() = 'authenticated');

-- Follow Ups
create table public.follow_ups (
  id uuid default gen_random_uuid() primary key,
  prospect_id uuid references public.prospects on delete cascade not null,
  follow_up_number integer not null,
  phase text not null check (phase in ('contacto', 'venta', 'cierre')),
  status text not null default 'pendiente' check (status in ('pendiente', 'enviado', 'respondido', 'sin_respuesta')),
  prospect_responded boolean not null default false,
  response_content text,
  notes text,
  sent_at timestamp with time zone,
  setter_id uuid references public.profiles not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.follow_ups enable row level security;

create policy "Authenticated users can manage follow_ups" on public.follow_ups
  for all using (auth.role() = 'authenticated');
