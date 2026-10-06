-- Terminación/color del 1400w por parada (la columna 1400w agrupa todas las terminaciones).
alter table public.logistica_diaria
  add column if not exists notas_1400 text;
