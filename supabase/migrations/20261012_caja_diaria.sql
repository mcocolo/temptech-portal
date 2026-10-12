-- Caja Diaria: se asigna dinero a un empleado responsable y se cargan gastos contra esa caja.
create table if not exists public.caja_diaria (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid,
  empleado_nombre text,            -- apodo/nombre denormalizado para mostrar
  concepto text,
  monto_asignado numeric not null default 0,
  fecha date not null default current_date,
  estado text not null default 'abierta',   -- 'abierta' | 'cerrada'
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.caja_diaria enable row level security;
drop policy if exists caja_diaria_all on public.caja_diaria;
create policy caja_diaria_all on public.caja_diaria for all to authenticated using (true) with check (true);

create table if not exists public.caja_gastos (
  id uuid primary key default gen_random_uuid(),
  caja_id uuid not null references public.caja_diaria(id) on delete cascade,
  fecha date not null default current_date,
  descripcion text not null,
  monto numeric not null default 0,
  factura_a boolean not null default false,   -- el gasto incluye Factura A
  pagado_por text,                            -- quién realizó el pago (puede diferir del responsable)
  comprobante_url text,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.caja_gastos enable row level security;
drop policy if exists caja_gastos_all on public.caja_gastos;
create policy caja_gastos_all on public.caja_gastos for all to authenticated using (true) with check (true);

create index if not exists idx_caja_gastos_caja on public.caja_gastos(caja_id);
