-- OT de Corte para 1400w: tapas (T) y contratapas (CT)
-- tapas/contratapas = piezas BUENAS (OK); hojas_t/hojas_ct = hojas reales usadas (para merma y descuento de stock)
alter table public.produccion_ot add column if not exists tapas       integer;   -- T OK (buenas)
alter table public.produccion_ot add column if not exists contratapas integer;   -- CT OK (buenas)
alter table public.produccion_ot add column if not exists hojas_t     integer;   -- hojas reales usadas para tapas
alter table public.produccion_ot add column if not exists hojas_ct    integer;   -- hojas reales usadas para contratapas
alter table public.produccion_ot add column if not exists insumo_tapa text;      -- código de hoja de la tapa
