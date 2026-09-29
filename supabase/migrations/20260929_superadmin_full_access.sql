-- ACCESO TOTAL para administradores plenos (admin y superadmin), sin excepciones.
-- Idea: en vez de tocar decenas de políticas una por una, agregamos UNA política
-- PERMISIVA por tabla. Las políticas permisivas se SUMAN (OR) a las existentes:
-- le dan acceso total al admin y NO le quitan acceso a ningún otro rol.

-- 0) Asegurar la bandera de superadmin (por si no se corrió la migración previa)
alter table public.profiles
  add column if not exists es_superadmin boolean not null default false;

-- 1) Función que identifica a un administrador pleno.
--    SECURITY DEFINER: corre como dueño y evita recursión de RLS al leer profiles.
create or replace function public.is_full_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'admin' or es_superadmin = true)
  );
$$;

grant execute on function public.is_full_admin() to authenticated;

-- 2) Política permisiva de acceso total para admin/superadmin en CADA tabla con RLS.
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity = true
  loop
    execute format('drop policy if exists zz_admin_full on public.%I', t.relname);
    execute format(
      'create policy zz_admin_full on public.%I as permissive for all to authenticated ' ||
      'using (public.is_full_admin()) with check (public.is_full_admin())',
      t.relname
    );
  end loop;
end $$;
