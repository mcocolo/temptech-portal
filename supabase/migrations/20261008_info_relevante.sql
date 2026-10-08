-- Información relevante: notas importantes consultables (racks, ubicaciones, datos clave, etc.)
create table if not exists public.info_relevante (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contenido text not null,
  tags text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.info_relevante enable row level security;
drop policy if exists info_relevante_all on public.info_relevante;
create policy info_relevante_all on public.info_relevante for all to authenticated using (true) with check (true);
