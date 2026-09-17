-- Revisión de pedidos con concepto 'devoluciones_pendientes'
-- (aparecen en la sección Devoluciones Distribuidores para ser revisados)
alter table public.pedidos add column if not exists dev_revisado boolean not null default false;
alter table public.pedidos add column if not exists dev_revisado_por text;
alter table public.pedidos add column if not exists dev_revisado_at timestamptz;
