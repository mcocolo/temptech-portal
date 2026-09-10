-- Cierre del día del chofer: foto del vehículo, combustible y foto del ticket
alter table public.logistica_km add column if not exists foto_vehiculo_url text;
alter table public.logistica_km add column if not exists combustible_monto  numeric;
alter table public.logistica_km add column if not exists foto_ticket_url    text;
