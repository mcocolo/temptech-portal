-- OT de Corte para 1400w: tapas (T) y contratapas (CT)
-- tapas/contratapas = piezas BUENAS (OK); hojas_t/hojas_ct = hojas reales usadas (para merma y descuento de stock)
alter table public.produccion_ot add column if not exists tapas       integer;   -- T OK (buenas)
alter table public.produccion_ot add column if not exists contratapas integer;   -- CT OK (buenas)
alter table public.produccion_ot add column if not exists hojas_t     integer;   -- hojas reales usadas para tapas
alter table public.produccion_ot add column if not exists hojas_ct    integer;   -- hojas reales usadas para contratapas
alter table public.produccion_ot add column if not exists insumo_tapa text;      -- código de hoja de la tapa
alter table public.produccion_ot add column if not exists ct_nc            integer;   -- CT falladas (no conformes)
alter table public.produccion_ot add column if not exists t_nc             integer;   -- T falladas
alter table public.produccion_ot add column if not exists tomar_pulmon_ct  integer;   -- CT tomadas del pulmón para completar
alter table public.produccion_ot add column if not exists tomar_pulmon_t   integer;   -- T tomadas del pulmón
alter table public.produccion_ot add column if not exists lote_ct          text;      -- N° de lote de la hoja MPSTD6 (CT)
alter table public.produccion_ot add column if not exists lote_t           text;      -- N° de lote de la hoja de la tapa (T)

-- Stock de semielaborados: pulmón (OK sobrantes) y NC (fallados), por tipo/modelo/color
create table if not exists public.produccion_pulmon (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  tipo        text not null,                 -- 'T' | 'CT'
  estado      text not null default 'OK',    -- 'OK' | 'NC'
  modelo      text not null,                 -- 250w | 500w | 1400w ...
  terminacion text not null default '',      -- color de la tapa (solo 1400w T); '' para CT y 250/500
  cantidad    integer not null default 0,
  unique (tipo, estado, modelo, terminacion)
);
alter table public.produccion_pulmon enable row level security;
do $$ begin
  create policy "produccion_pulmon_all" on public.produccion_pulmon for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
