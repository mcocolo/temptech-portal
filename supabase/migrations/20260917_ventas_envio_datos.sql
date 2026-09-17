-- Datos de entrega para ventas que salen por Logística (dirección, localidad, zona, DNI)
-- Se usan en la planilla de Logística Diaria al traer la venta a la ruta.
alter table public.ventas add column if not exists envio_datos jsonb;
