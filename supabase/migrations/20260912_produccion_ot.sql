-- Orden de Trabajo por etapa (arrancamos con Corte)
create table if not exists public.produccion_ot (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  lote_id       uuid references public.produccion_lotes(id) on delete cascade,
  etapa         text not null default 'corte',
  fecha_inicio  date,
  hora_inicio   text,
  fecha_fin     date,
  hora_fin      text,
  personal      jsonb not null default '[]',      -- apodos de empleados
  disco_txt     text,
  cinta_txt     text,
  pie_txt       text,
  herramental_cambio text,
  mediciones    jsonb not null default '[]',      -- [v1..v5]
  medida_objetivo numeric,
  hojas_usadas  integer,
  piezas        integer,
  duracion_min  integer,
  notas         text,
  unique (lote_id, etapa)
);
create index if not exists produccion_ot_lote_idx on public.produccion_ot (lote_id);

alter table public.produccion_ot enable row level security;
do $$ begin
  create policy "produccion_ot_all" on public.produccion_ot for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
