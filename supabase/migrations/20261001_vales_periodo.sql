-- Mes al que corresponde el vale (para el reporte mensual por empleado). Formato 'YYYY-MM'.
alter table public.vales_empleados
  add column if not exists periodo text;

-- Backfill: para los vales ya cargados, usar el mes de la fecha
update public.vales_empleados
  set periodo = to_char(fecha::date, 'YYYY-MM')
  where periodo is null and fecha is not null;
