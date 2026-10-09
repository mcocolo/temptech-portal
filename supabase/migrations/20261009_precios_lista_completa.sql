-- Columnas extra para replicar la lista de precios completa (igual al Excel/PDF).
alter table public.precios add column if not exists negocio text;
alter table public.precios add column if not exists producto text;        -- "Panel Calefactor Slim", "Calefón Electrico", "Anafe Inducción + Extractor"
alter table public.precios add column if not exists modelo_lista text;      -- modelo tal cual el PDF (ej: "One 3,5/5,5/7Kw 220V Silver")
alter table public.precios add column if not exists costo_siva numeric;
alter table public.precios add column if not exists costo_civa numeric;
alter table public.precios add column if not exists peso text;
alter table public.precios add column if not exists medidas text;          -- medidas o volumen (ej: "230*230*72mm" / "0,010 m3")
alter table public.precios add column if not exists fijacion text;         -- "Pared" / "Patas / Pared"
alter table public.precios add column if not exists disponibilidad text;   -- "NORMAL", etc.
alter table public.precios add column if not exists imagen_url text;
alter table public.precios add column if not exists orden int;

-- Banner por categoría para la portada del PDF
alter table public.condiciones_precios add column if not exists banner_url text;
