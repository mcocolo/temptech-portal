-- Varias fotos por máquina (además de la foto_url principal, que se mantiene por compatibilidad).
alter table public.maquinas
  add column if not exists fotos jsonb not null default '[]'::jsonb;

-- Backfill: si hay foto_url y no hay fotos, usarla como primera
update public.maquinas
  set fotos = jsonb_build_array(foto_url)
  where (fotos is null or fotos = '[]'::jsonb) and foto_url is not null and foto_url <> '';
