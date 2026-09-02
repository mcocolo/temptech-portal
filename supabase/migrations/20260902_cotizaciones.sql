-- Cotizaciones del dólar cargadas manualmente (una por semana idealmente).
-- Cada fila registra cuánto valía el dólar en esa fecha.
create table if not exists public.cotizaciones (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null default current_date,
  valor      numeric not null,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists cotizaciones_fecha_idx on public.cotizaciones (fecha desc);

alter table public.cotizaciones enable row level security;

-- Lectura e inserción para usuarios autenticados (en la práctica solo el admin
-- ve el pop-up y el reporte). No se permite update/delete.
create policy "cotizaciones_read" on public.cotizaciones
  for select to authenticated using (true);

create policy "cotizaciones_insert" on public.cotizaciones
  for insert to authenticated with check (true);
