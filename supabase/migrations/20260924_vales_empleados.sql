-- Vales / adelantos de empleados. Se acumulan y se descuentan del sueldo a fin de mes.
create table if not exists public.vales_empleados (
  id            uuid primary key default gen_random_uuid(),
  empleado_id   uuid not null references public.empleados(id) on delete cascade,
  fecha         date not null default current_date,
  monto         numeric not null default 0,
  comentario    text,                          -- plata, producto, o lo que pidieron
  saldado       boolean not null default false, -- true = ya descontado del sueldo
  saldado_fecha date,
  creado_por    text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_vales_emp on public.vales_empleados (empleado_id);

alter table public.vales_empleados enable row level security;
drop policy if exists vales_empleados_all on public.vales_empleados;
create policy vales_empleados_all on public.vales_empleados for all to authenticated using (true) with check (true);
