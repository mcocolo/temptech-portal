-- Superadmin como BANDERA, no como rol.
-- Problema: al poner role='superadmin' a Martin, todas las políticas RLS que
-- chequean role='admin' (pedidos, reclamos, videos, manuales, novedades, etc.)
-- lo dejaban afuera y no veía los datos.
-- Solución: el rol vuelve a 'admin' (RLS lo habilita en todos lados) y el
-- "superadmin" se marca con la columna es_superadmin, que la app lee para las
-- funciones exclusivas (Vales, edición de medidas, etc.).

alter table public.profiles
  add column if not exists es_superadmin boolean not null default false;

-- Marcar a Martin como superadmin (ajustá el email si su login es otro)
update public.profiles set es_superadmin = true
  where lower(email) = 'martin@temptech.com.ar'
     or role = 'superadmin';

-- Devolver el rol a 'admin' para que la RLS lo trate como administrador pleno
update public.profiles set role = 'admin'
  where role = 'superadmin';
