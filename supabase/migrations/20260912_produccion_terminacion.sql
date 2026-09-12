-- Terminación / color del lote (usado por 1400w: Blanco, Madera Veteada, Smart Wifi, etc.)
alter table public.produccion_lotes add column if not exists terminacion text;
-- Etiqueta opcional que reemplaza el N° de lote en pantalla (ej: "F75-95", "Pulmón T")
alter table public.produccion_lotes add column if not exists etiqueta text;
