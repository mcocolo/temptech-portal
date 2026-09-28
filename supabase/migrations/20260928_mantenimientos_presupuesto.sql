-- Archivo de presupuesto del mantenimiento (puede llegar después del día del service)
alter table public.mantenimientos add column if not exists presupuesto_url text;
