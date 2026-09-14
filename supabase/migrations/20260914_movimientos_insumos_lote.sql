-- N° de lote del insumo en cada ingreso/egreso (trazabilidad de la hoja usada)
alter table public.movimientos_insumos add column if not exists lote text;
