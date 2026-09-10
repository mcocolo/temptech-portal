-- Vínculo de una parada de logística con un pedido de repuestos
alter table public.logistica_diaria add column if not exists repuesto_id uuid;
create index if not exists logistica_repuesto_idx on public.logistica_diaria (repuesto_id);
