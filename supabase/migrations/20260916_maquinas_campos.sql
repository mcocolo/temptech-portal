-- Campos completos de la ficha de máquina (según planilla)
alter table public.maquinas add column if not exists numero           text;
alter table public.maquinas add column if not exists sigla            text;
alter table public.maquinas add column if not exists voltaje          text;
alter table public.maquinas add column if not exists potencia         text;
alter table public.maquinas add column if not exists ubicacion_fisica text;
alter table public.maquinas add column if not exists sectores         jsonb not null default '[]';
alter table public.maquinas add column if not exists descripcion      text;
alter table public.maquinas add column if not exists servicio         text;
alter table public.maquinas add column if not exists proveedor        text;
alter table public.maquinas add column if not exists repuestos        text;
alter table public.maquinas add column if not exists anio_ingreso     text;
alter table public.maquinas add column if not exists anio_salida      text;
alter table public.maquinas add column if not exists motivo           text;
alter table public.maquinas add column if not exists observaciones    text;
-- nombre = "Equipo"; permitir importar aunque venga vacío en alguna fila
alter table public.maquinas alter column nombre drop not null;
