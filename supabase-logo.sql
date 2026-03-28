-- Agregar logo_url a organizations
alter table public.organizations
  add column if not exists logo_url text default '';

-- Crear bucket para logos (ejecutar también)
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Policy para subir logos
create policy "Authenticated users can upload logos"
on storage.objects for insert
with check (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "Logos are publicly readable"
on storage.objects for select
using (bucket_id = 'logos');

create policy "Authenticated users can update logos"
on storage.objects for update
using (bucket_id = 'logos' and auth.role() = 'authenticated');
