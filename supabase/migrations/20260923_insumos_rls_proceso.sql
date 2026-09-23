-- Permitir que los usuarios internos (proceso/mantenimiento/admin2) descuenten stock
-- y registren movimientos al cargar las OT. Antes el descuento fallaba en silencio
-- porque estas tablas no dejaban escribir a esos roles.
alter table public.insumos enable row level security;
drop policy if exists insumos_all on public.insumos;
create policy insumos_all on public.insumos for all to authenticated using (true) with check (true);

alter table public.movimientos_insumos enable row level security;
drop policy if exists movimientos_insumos_all on public.movimientos_insumos;
create policy movimientos_insumos_all on public.movimientos_insumos for all to authenticated using (true) with check (true);
