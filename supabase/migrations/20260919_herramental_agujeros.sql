-- Contador de agujeros acumulados por herramienta (micromechas) y por máquina
alter table public.herramental add column if not exists agujeros integer not null default 0;
alter table public.maquinas add column if not exists agujeros integer not null default 0;
