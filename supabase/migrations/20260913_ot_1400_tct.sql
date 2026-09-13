-- OT de Corte para 1400w: tapas (T) y contratapas (CT) cortadas + hoja propia de la tapa
alter table public.produccion_ot add column if not exists tapas       integer;
alter table public.produccion_ot add column if not exists contratapas integer;
alter table public.produccion_ot add column if not exists insumo_tapa text;
