-- Tamaño de envase del insumo (unidades por envase, ej. 20 kg por bolsa de enduido).
-- Permite cargar Ingreso/Egreso por envases y convertir a la unidad de stock (y viceversa).
alter table public.insumos add column if not exists tamano_envase numeric;
