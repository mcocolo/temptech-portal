-- Ausencia por médico en la asistencia diaria
alter table public.asistencias add column if not exists medico boolean not null default false;

-- Días de examen / estudio solicitados por el empleado (los carga el admin)
create table if not exists public.dias_examen (
  id           uuid primary key default gen_random_uuid(),
  empleado_id  uuid not null references public.empleados(id) on delete cascade,
  fecha        date not null,
  fecha_hasta  date,
  dias         integer,
  motivo       text,
  creado_por   text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_examen_emp on public.dias_examen (empleado_id);
alter table public.dias_examen enable row level security;
drop policy if exists dias_examen_all on public.dias_examen;
create policy dias_examen_all on public.dias_examen for all to authenticated using (true) with check (true);
