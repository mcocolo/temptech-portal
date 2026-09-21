-- Registro de charlas con empleados
create table if not exists public.charlas (
  id           uuid primary key default gen_random_uuid(),
  empleado_id  uuid references public.empleados(id) on delete cascade,
  motivo       text,
  fecha        date not null,
  responsable  text,          -- quién tuvo la charla con el empleado
  creado_por   text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_charlas_emp on public.charlas (empleado_id);

alter table public.charlas enable row level security;
drop policy if exists charlas_all on public.charlas;
create policy charlas_all on public.charlas for all to authenticated using (true) with check (true);
