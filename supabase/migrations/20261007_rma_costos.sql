-- RMA / Devoluciones: costeo y reacondicionamiento.

-- 1) Insumos: costo unitario + si se usa al reacondicionar una devolución/RMA
alter table public.insumos
  add column if not exists costo numeric,
  add column if not exists uso_rma boolean not null default false;

-- 2) Tabla de costos de OPERACIONES (mano de obra / procesos que no son un insumo puntual)
create table if not exists public.operaciones_rma (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  costo numeric not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.operaciones_rma enable row level security;
drop policy if exists operaciones_rma_all on public.operaciones_rma;
create policy operaciones_rma_all on public.operaciones_rma for all to authenticated using (true) with check (true);

-- 3) Registro de costos de cada RMA/Service procesado (para el reporte de costos)
create table if not exists public.rma_costos (
  id uuid primary key default gen_random_uuid(),
  origen text not null,                 -- 'distribuidor' | 'service'
  ref_id uuid,                          -- devoluciones_distribuidor.id o egresos_garantia.id / reclamo
  ref_codigo text,                      -- DV-xxxx / DEV-xxxx para mostrar
  panel_codigo text,                    -- código del panel reacondicionado
  reingreso boolean not null default false,
  cantidad integer not null default 1,
  materiales jsonb not null default '[]'::jsonb,   -- [{codigo, nombre, cantidad, costo_unit, subtotal}]
  operaciones jsonb not null default '[]'::jsonb,  -- [{nombre, costo}]
  costo_total numeric not null default 0,
  notas text,
  usuario text,
  created_at timestamptz not null default now()
);
create index if not exists rma_costos_origen_idx on public.rma_costos (origen);
create index if not exists rma_costos_ref_idx on public.rma_costos (ref_id);
alter table public.rma_costos enable row level security;
drop policy if exists rma_costos_all on public.rma_costos;
create policy rma_costos_all on public.rma_costos for all to authenticated using (true) with check (true);
