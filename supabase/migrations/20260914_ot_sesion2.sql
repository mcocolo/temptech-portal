-- Segunda sesión de tiempos en la OT (arranca un día y termina otro)
alter table public.produccion_ot add column if not exists fecha_inicio2 date;
alter table public.produccion_ot add column if not exists hora_inicio2  text;
alter table public.produccion_ot add column if not exists fecha_fin2    date;
alter table public.produccion_ot add column if not exists hora_fin2     text;
