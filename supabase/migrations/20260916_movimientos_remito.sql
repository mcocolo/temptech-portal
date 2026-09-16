-- Datos de remito en los ingresos de insumos
alter table public.movimientos_insumos add column if not exists fecha       date;
alter table public.movimientos_insumos add column if not exists nro_remito  text;
alter table public.movimientos_insumos add column if not exists remito_url  text;
