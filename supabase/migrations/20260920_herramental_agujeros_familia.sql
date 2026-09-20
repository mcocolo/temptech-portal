-- Agujeros de las mechas separados por familia (250w / 500w / 1400w), como los cortes del disco.
-- TD y simple de la misma familia cuentan igual.
alter table public.herramental add column if not exists agujeros_250w integer not null default 0;
alter table public.herramental add column if not exists agujeros_500w integer not null default 0;
alter table public.herramental add column if not exists agujeros_1400w integer not null default 0;
