-- Sectores en los que puede participar cada empleado (para filtrar en las OT)
alter table public.empleados add column if not exists sectores jsonb not null default '[]';
