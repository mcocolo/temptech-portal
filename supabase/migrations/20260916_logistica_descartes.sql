-- Sugerencias de "Traer a logística" descartadas (para no volver a mostrarlas)
create table if not exists public.logistica_descartes (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fuente     text not null,   -- pedido | venta | repuesto
  ref_id     text not null,
  unique (fuente, ref_id)
);
alter table public.logistica_descartes enable row level security;
do $$ begin
  create policy "logistica_descartes_all" on public.logistica_descartes for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
