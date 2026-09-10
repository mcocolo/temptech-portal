-- Kilometraje por camioneta y por día (para calcular cuánto se condujo)
create table if not exists public.logistica_km (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  fecha        date not null,
  camioneta_id uuid references public.camionetas(id) on delete cascade,
  km_inicial   numeric,
  km_final     numeric,
  unique (fecha, camioneta_id)
);
create index if not exists logistica_km_cam_idx on public.logistica_km (camioneta_id, fecha desc);

alter table public.logistica_km enable row level security;
create policy "logistica_km_read"   on public.logistica_km for select to authenticated using (true);
create policy "logistica_km_insert" on public.logistica_km for insert to authenticated with check (true);
create policy "logistica_km_update" on public.logistica_km for update to authenticated using (true) with check (true);
create policy "logistica_km_delete" on public.logistica_km for delete to authenticated using (true);
