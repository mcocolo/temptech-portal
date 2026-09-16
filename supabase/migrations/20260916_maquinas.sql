-- Mantenimiento: base de máquinas
create table if not exists public.maquinas (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  nombre        text not null,
  codigo        text,
  tipo          text,
  sector        text,
  marca         text,
  modelo        text,
  nro_serie     text,
  fecha_ingreso date,
  estado        text not null default 'Operativa',   -- Operativa | En mantenimiento | Fuera de servicio
  ubicacion     text,
  foto_url      text,
  notas         text,
  activo        boolean not null default true
);
alter table public.maquinas enable row level security;
do $$ begin
  create policy "maquinas_all" on public.maquinas for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
