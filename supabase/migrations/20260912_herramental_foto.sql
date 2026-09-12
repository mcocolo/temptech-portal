-- Foto, fecha de ingreso y sectores (varios) del herramental
alter table public.herramental add column if not exists foto_url      text;
alter table public.herramental add column if not exists fecha_ingreso date;
alter table public.herramental add column if not exists sectores      jsonb not null default '[]';
