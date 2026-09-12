-- Herramental de producción (disco diamantado, cinta métrica, pie metálico, etc.)
-- tipo = categoría para filtrar en las OT (Disco, Cinta, Pie, ...)
create table if not exists public.herramental (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre     text not null,
  tipo       text,
  codigo     text,
  lote       text,
  sector     text,
  activo     boolean not null default true
);
create index if not exists herramental_tipo_idx on public.herramental (tipo);

alter table public.herramental enable row level security;
do $$ begin
  create policy "herramental_all" on public.herramental for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
