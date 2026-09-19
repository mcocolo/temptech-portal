-- Contador de cortes del disco por familia (cada corte = un panel cortado)
alter table public.herramental add column if not exists cortes_250w integer not null default 0;
alter table public.herramental add column if not exists cortes_500w integer not null default 0;
alter table public.herramental add column if not exists cortes_1400w integer not null default 0;
