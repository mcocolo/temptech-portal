-- Empleados de producción (apodo usado en planillas + nombre completo)
create table if not exists public.empleados (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  apodo      text not null,
  nombre     text,
  sector     text,
  activo     boolean not null default true
);
create index if not exists empleados_apodo_idx on public.empleados (apodo);

alter table public.empleados enable row level security;
do $$ begin
  create policy "empleados_all" on public.empleados for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
