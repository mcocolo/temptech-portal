-- Contador de usos por modelo (se acumula a medida que los lotes usan la herramienta)
alter table public.herramental add column if not exists usos_250w  integer not null default 0;
alter table public.herramental add column if not exists usos_500w  integer not null default 0;
alter table public.herramental add column if not exists usos_1400w integer not null default 0;

-- Vínculo de la herramienta usada en la OT (para sumar los usos)
alter table public.produccion_ot add column if not exists disco_id uuid;
alter table public.produccion_ot add column if not exists cinta_id uuid;
alter table public.produccion_ot add column if not exists pie_id   uuid;
