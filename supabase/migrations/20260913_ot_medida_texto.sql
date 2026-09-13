-- La medida objetivo del panel es una dimensión (ej. 290x590mm), no un número
alter table public.produccion_ot alter column medida_objetivo type text using medida_objetivo::text;
