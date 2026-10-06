-- El distribuidor puede CARGAR y VER solo sus propias devoluciones de mercadería.
-- Revisar / editar / entregar siguen siendo exclusivo de admin (política zz_admin_full existente).
alter table public.devoluciones_distribuidor enable row level security;

-- Ver solo las propias (permisiva: se suma a la de admin, no se la saca a nadie)
drop policy if exists devdist_dist_select on public.devoluciones_distribuidor;
create policy devdist_dist_select on public.devoluciones_distribuidor
  for select to authenticated
  using (distribuidor_id = auth.uid());

-- Crear solo a su propio nombre
drop policy if exists devdist_dist_insert on public.devoluciones_distribuidor;
create policy devdist_dist_insert on public.devoluciones_distribuidor
  for insert to authenticated
  with check (distribuidor_id = auth.uid());
