-- ══════════════════════════════════════════════════════════════════════════
-- Producción por lotes (línea secuencial de sectores)
-- ══════════════════════════════════════════════════════════════════════════

-- Lote: siempre un modelo; avanza etapa por etapa llevando una cantidad
create table if not exists public.produccion_lotes (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  numero            integer,                              -- número de lote (lo define el usuario, ej. 511)
  modelo            text not null,
  cantidad_objetivo integer not null,
  cantidad_actual   integer not null,
  hojas             integer,
  temporada         integer,
  etapa             text not null default 'por_iniciar',  -- por_iniciar|corte|armado|encuadre|aguj2|enduido_lija|pintura|terminado
  estado            text not null default 'planificado',  -- planificado|en_proceso|terminado|cancelado
  notas             text,
  created_by        text
);
create index if not exists produccion_lotes_etapa_idx on public.produccion_lotes (etapa);

-- Parte diario por etapa (cuánto avanzó cada sector ese día)
create table if not exists public.produccion_partes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lote_id     uuid references public.produccion_lotes(id) on delete cascade,
  etapa       text not null,
  fecha       date not null default current_date,
  cantidad    integer not null,
  usuario     text,
  notas       text
);
create index if not exists produccion_partes_lote_idx on public.produccion_partes (lote_id);

-- No conformidades (merma / reproceso)
create table if not exists public.produccion_no_conformidades (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  lote_id             uuid references public.produccion_lotes(id) on delete cascade,
  etapa               text not null,
  cantidad            integer not null,
  motivo              text,
  recuperable         boolean not null default false,
  cantidad_recuperada integer not null default 0,
  usuario             text
);
create index if not exists produccion_ncf_lote_idx on public.produccion_no_conformidades (lote_id);

alter table public.produccion_lotes             enable row level security;
alter table public.produccion_partes            enable row level security;
alter table public.produccion_no_conformidades  enable row level security;
do $$ begin
  create policy "produccion_lotes_all" on public.produccion_lotes for all to authenticated using (true) with check (true);
  create policy "produccion_partes_all" on public.produccion_partes for all to authenticated using (true) with check (true);
  create policy "produccion_ncf_all" on public.produccion_no_conformidades for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
