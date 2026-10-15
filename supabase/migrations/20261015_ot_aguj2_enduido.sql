-- Contadores de uso para las nuevas hojas de proceso (Aguj N°2 y Enduido + Lija)
alter table public.maquinas    add column if not exists usos_aguj2 integer not null default 0;
alter table public.maquinas    add column if not exists usos_enduido_lija integer not null default 0;
alter table public.herramental add column if not exists usos_aguj2 integer not null default 0;
alter table public.herramental add column if not exists usos_enduido_lija integer not null default 0;
