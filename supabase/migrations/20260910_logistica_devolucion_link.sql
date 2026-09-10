-- Vínculo de una parada de logística con el caso de service/garantía que la originó
-- devoluciones.id es bigint (no uuid)
alter table public.logistica_diaria
  add column if not exists devolucion_id bigint references public.devoluciones(id) on delete set null;

create index if not exists logistica_devolucion_idx on public.logistica_diaria (devolucion_id);
