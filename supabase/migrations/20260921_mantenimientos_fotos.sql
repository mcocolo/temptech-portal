-- Fotos adjuntas al registro de mantenimiento (antes/después, remito del service, etc.)
alter table public.mantenimientos add column if not exists fotos jsonb not null default '[]'::jsonb;
