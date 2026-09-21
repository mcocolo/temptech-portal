-- Registro de suspensiones de empleados
create table if not exists public.suspensiones (
  id           uuid primary key default gen_random_uuid(),
  empleado_id  uuid references public.empleados(id) on delete cascade,
  motivo       text,
  fecha        date not null,
  dias         int not null default 1,
  creado_por   text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_suspensiones_emp on public.suspensiones (empleado_id);

alter table public.suspensiones enable row level security;
drop policy if exists suspensiones_all on public.suspensiones;
create policy suspensiones_all on public.suspensiones for all to authenticated using (true) with check (true);
