-- Choferes (lista simple para asignar a las rutas)
create table if not exists public.choferes (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre     text not null,
  telefono   text,
  email      text,
  activo     boolean not null default true
);

alter table public.choferes enable row level security;
create policy "choferes_read"   on public.choferes for select to authenticated using (true);
create policy "choferes_insert" on public.choferes for insert to authenticated with check (true);
create policy "choferes_update" on public.choferes for update to authenticated using (true) with check (true);
create policy "choferes_delete" on public.choferes for delete to authenticated using (true);
