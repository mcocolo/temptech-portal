-- Cierre del día ampliado: litros, foto de planilla firmada, varias fotos de tickets, estado cerrado
alter table public.logistica_km add column if not exists combustible_litros numeric;
alter table public.logistica_km add column if not exists foto_planilla_url  text;
alter table public.logistica_km add column if not exists fotos_tickets      jsonb not null default '[]';
alter table public.logistica_km add column if not exists cerrado            boolean not null default false;
alter table public.logistica_km add column if not exists cerrado_at         timestamptz;
