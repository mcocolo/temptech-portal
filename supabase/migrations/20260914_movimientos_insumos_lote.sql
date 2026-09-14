-- N° de lote del insumo en cada ingreso/egreso (trazabilidad de la hoja usada)
alter table public.movimientos_insumos add column if not exists lote text;
-- Auditoría de edición (quién editó el movimiento, además del que lo creó en usuario_nombre)
alter table public.movimientos_insumos add column if not exists editado_por    text;
alter table public.movimientos_insumos add column if not exists editado_por_at timestamptz;
