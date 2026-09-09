-- Registro de presupuestos generados (para que quede historial de lo enviado).
create table if not exists public.presupuestos (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  created_by_id      uuid,
  created_by_nombre  text,
  distribuidor_id    uuid,
  cliente_nombre     text not null,
  cliente_cuit_dni   text,
  cliente_direccion  text,
  cliente_localidad  text,
  items              jsonb not null default '[]',
  incluir_iva        boolean not null default false,
  iva_monto          numeric not null default 0,
  total_neto         numeric not null default 0,
  total              numeric not null default 0,
  notas              text
);

create index if not exists presupuestos_created_at_idx on public.presupuestos (created_at desc);

alter table public.presupuestos enable row level security;

-- Lectura e inserción para usuarios autenticados (en la práctica: admin y
-- vendedores, que son los que ven la pantalla de Presupuesto).
create policy "presupuestos_read"   on public.presupuestos for select to authenticated using (true);
create policy "presupuestos_insert" on public.presupuestos for insert to authenticated with check (true);
