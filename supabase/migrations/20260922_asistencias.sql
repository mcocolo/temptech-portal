-- Asistencia diaria de empleados (ingreso/egreso, horas extra, ausencias/vale)
create table if not exists public.asistencias (
  id           uuid primary key default gen_random_uuid(),
  empleado_id  uuid not null references public.empleados(id) on delete cascade,
  fecha        date not null,
  entra        text,          -- 'HH:MM'
  sale         text,          -- 'HH:MM'
  he           text,          -- horas extra (calculado, editable)
  vale         text,          -- vale / motivo / ausencia (enfermo, permiso, $, etc.)
  ausente      boolean not null default false,
  creado_por   text,
  updated_at   timestamptz not null default now(),
  unique (empleado_id, fecha)
);
create index if not exists idx_asis_fecha on public.asistencias (fecha);

alter table public.asistencias enable row level security;
drop policy if exists asistencias_all on public.asistencias;
create policy asistencias_all on public.asistencias for all to authenticated using (true) with check (true);
