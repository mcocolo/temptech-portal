-- Vacaciones de empleados (rango Desde/Hasta + días hábiles calculados).
create table if not exists public.vacaciones (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid references public.empleados(id) on delete cascade,
  fecha date not null,            -- desde
  fecha_hasta date not null,      -- hasta
  dias integer not null default 0,-- días hábiles (Lun-Vie) en el rango
  notas text,
  creado_por text,
  created_at timestamptz not null default now()
);
create index if not exists vacaciones_empleado_idx on public.vacaciones (empleado_id);
create index if not exists vacaciones_fecha_idx on public.vacaciones (fecha);

alter table public.vacaciones enable row level security;
drop policy if exists vacaciones_all on public.vacaciones;
create policy vacaciones_all on public.vacaciones for all to authenticated using (true) with check (true);
