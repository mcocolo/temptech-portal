-- Declaraciones de "Devolución pendiente" de distribuidores:
-- productos + cantidades que el distribuidor devuelve (ingresan). Quedan para revisión
-- del admin. NO mueven stock. Las puede cargar el distribuidor o el admin en su nombre.
create table if not exists public.devoluciones_distribuidor (
  id              uuid primary key default gen_random_uuid(),
  distribuidor_id uuid references auth.users(id),
  origen          text not null default 'distribuidor',   -- 'distribuidor' | 'admin'
  items           jsonb not null default '[]'::jsonb,      -- [{codigo,nombre,modelo,cantidad}]
  notas           text,
  estado          text not null default 'pendiente',       -- 'pendiente' | 'revisado'
  revisado_por    text,
  revisado_at     timestamptz,
  creado_por      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_devdist_distribuidor on public.devoluciones_distribuidor (distribuidor_id);
create index if not exists idx_devdist_estado on public.devoluciones_distribuidor (estado);

alter table public.devoluciones_distribuidor enable row level security;

-- Admin = profiles.role in ('admin','admin2')
-- SELECT: el distribuidor ve las suyas; el admin ve todas
drop policy if exists devdist_select on public.devoluciones_distribuidor;
create policy devdist_select on public.devoluciones_distribuidor for select to authenticated
  using (
    distribuidor_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','admin2'))
  );

-- INSERT: el distribuidor carga las suyas; el admin puede cargar en nombre de cualquiera
drop policy if exists devdist_insert on public.devoluciones_distribuidor;
create policy devdist_insert on public.devoluciones_distribuidor for insert to authenticated
  with check (
    distribuidor_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','admin2'))
  );

-- UPDATE: solo admin (marcar revisado, editar)
drop policy if exists devdist_update on public.devoluciones_distribuidor;
create policy devdist_update on public.devoluciones_distribuidor for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','admin2')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','admin2')));

-- DELETE: solo admin
drop policy if exists devdist_delete on public.devoluciones_distribuidor;
create policy devdist_delete on public.devoluciones_distribuidor for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','admin2')));
