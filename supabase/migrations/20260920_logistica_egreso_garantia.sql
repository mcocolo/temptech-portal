-- Vincula una parada de Logística Diaria con el egreso de garantía que la originó
-- (para no volver a sugerirla en "Traer a logística" una vez traída)
alter table public.logistica_diaria add column if not exists egreso_garantia_id uuid;
