-- Marcar insumos discontinuados / fuera de uso
alter table public.insumos add column if not exists discontinuado boolean not null default false;
