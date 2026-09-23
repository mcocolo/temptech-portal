-- Suspensiones: rango de fechas (fecha = desde). Permite marcar los días en la grilla de asistencia.
alter table public.suspensiones add column if not exists fecha_hasta date;
