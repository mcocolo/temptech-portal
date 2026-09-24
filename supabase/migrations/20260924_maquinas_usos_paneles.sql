-- Contador de uso de máquinas (paneles procesados), para MAQ-SIL / PRENSA-ALAMBRE en la OT Alambre
alter table public.maquinas add column if not exists usos_paneles integer not null default 0;
