-- Crear org de Arete Soluciones y vincular a todos los usuarios existentes
-- Ejecutar en Supabase SQL Editor

do $$
declare
  org_id uuid;
begin
  -- Crear la organización
  insert into public.organizations (
    name, slug, company_description, product_service,
    value_proposition, target_audience, website, plan, plan_limit
  ) values (
    'Arete Soluciones',
    'arete-soluciones',
    'Agencia especializada en automatización e inteligencia artificial para empresas. Implementamos soluciones tecnológicas que eliminan tareas repetitivas y optimizan procesos operativos.',
    'Automatizaciones con IA, flujos de trabajo inteligentes, desarrollo de software a medida, ERP, landing pages y páginas web, integraciones entre sistemas, chatbots, CRMs personalizados.',
    'Que las empresas dejen de depender de personas para tareas repetitivas, ganando tiempo y reduciendo costos operativos. Las empresas escalan sin contratar más gente.',
    'CEOs, directores generales, gerentes de operaciones y dueños de empresas medianas (10-200 empleados). Sectores: retail, logística, servicios profesionales, manufactura, inmobiliarias.',
    'https://aretesoluciones.shop',
    'pro',
    500
  )
  on conflict (slug) do update set name = excluded.name
  returning id into org_id;

  -- Vincular TODOS los usuarios existentes a esta org
  -- El primero que esté registrado queda como owner
  update public.profiles
  set
    organization_id = org_id,
    is_owner = true
  where organization_id is null;

  raise notice 'Org creada con ID: %', org_id;
end $$;
