-- OT de Armado (Aguj N°1 + Alambre + Pegado, Slim): todo el detalle en un jsonb
alter table public.produccion_ot add column if not exists datos jsonb;
