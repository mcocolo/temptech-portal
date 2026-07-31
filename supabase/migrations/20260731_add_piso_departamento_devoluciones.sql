-- Reclamos / Service-Garantía: piso y departamento como columnas reales.
-- Antes se combinaban dentro de `direccion`; ahora quedan estructurados.
alter table public.devoluciones
  add column if not exists piso text,
  add column if not exists departamento text;
