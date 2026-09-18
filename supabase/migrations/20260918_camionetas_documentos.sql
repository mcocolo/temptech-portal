-- Información importante por vehículo: foto del vehículo, seguro, póliza y cédula verde
alter table public.camionetas add column if not exists foto_url text;
alter table public.camionetas add column if not exists seguro_url text;
alter table public.camionetas add column if not exists poliza_url text;
alter table public.camionetas add column if not exists cedula_verde_url text;
