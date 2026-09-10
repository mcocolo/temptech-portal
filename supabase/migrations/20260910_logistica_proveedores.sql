-- ══════════════════════════════════════════════════════════════════════════
-- Logística: proveedores de insumos, camionetas y flujo de asignación
-- ══════════════════════════════════════════════════════════════════════════

-- ── Proveedores de insumos ────────────────────────────────────────────────
-- categoria: 'directos' | 'indirectos' | 'varios'
create table if not exists public.proveedores (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nombre      text not null,
  categoria   text not null default 'directos',
  contacto    text,
  telefono    text,
  direccion   text,
  localidad   text,
  notas       text,
  activo      boolean not null default true
);
create index if not exists proveedores_categoria_idx on public.proveedores (categoria);

alter table public.proveedores enable row level security;
create policy "proveedores_read"   on public.proveedores for select to authenticated using (true);
create policy "proveedores_insert" on public.proveedores for insert to authenticated with check (true);
create policy "proveedores_update" on public.proveedores for update to authenticated using (true) with check (true);
create policy "proveedores_delete" on public.proveedores for delete to authenticated using (true);

-- ── Camionetas (flota) ─────────────────────────────────────────────────────
create table if not exists public.camionetas (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nombre      text not null,
  patente     text,
  modelo      text,
  activa      boolean not null default true
);

alter table public.camionetas enable row level security;
create policy "camionetas_read"   on public.camionetas for select to authenticated using (true);
create policy "camionetas_insert" on public.camionetas for insert to authenticated with check (true);
create policy "camionetas_update" on public.camionetas for update to authenticated using (true) with check (true);
create policy "camionetas_delete" on public.camionetas for delete to authenticated using (true);

-- ── logistica_diaria: flujo pendiente → planificada → en ruta ──────────────
-- La fecha pasa a ser opcional: una parada "pendiente" todavía no tiene día.
alter table public.logistica_diaria alter column fecha drop not null;

alter table public.logistica_diaria add column if not exists camioneta_id  uuid references public.camionetas(id) on delete set null;
alter table public.logistica_diaria add column if not exists proveedor_id  uuid references public.proveedores(id) on delete set null;
alter table public.logistica_diaria add column if not exists chofer_id     uuid;               -- profile del chofer asignado
alter table public.logistica_diaria add column if not exists chofer_asignado text;             -- nombre del chofer asignado (snapshot)

create index if not exists logistica_camioneta_fecha_idx on public.logistica_diaria (fecha, camioneta_id);
create index if not exists logistica_pendientes_idx      on public.logistica_diaria (fecha) where fecha is null;
