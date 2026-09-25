-- Uso de máquinas por familia (paneles procesados), como en Herramental
alter table public.maquinas add column if not exists usos_250w  integer not null default 0;
alter table public.maquinas add column if not exists usos_500w  integer not null default 0;
alter table public.maquinas add column if not exists usos_1400w integer not null default 0;
