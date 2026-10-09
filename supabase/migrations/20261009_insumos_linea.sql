-- Insumos: agregar campo "linea" (Panel Calefactor / Calefones-Calderas / Anafes).
-- El campo "modelo" existente pasa a guardar el modelo específico dentro de la línea.
alter table public.insumos add column if not exists linea text;
