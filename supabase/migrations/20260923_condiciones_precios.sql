-- Condiciones comerciales por categoría (se muestran en Lista de Precios)
create table if not exists public.condiciones_precios (
  categoria  text primary key,
  texto      text,
  updated_at timestamptz not null default now()
);
alter table public.condiciones_precios enable row level security;
drop policy if exists condiciones_precios_all on public.condiciones_precios;
create policy condiciones_precios_all on public.condiciones_precios for all to authenticated using (true) with check (true);

insert into public.condiciones_precios (categoria, texto) values
  ('paneles_calefactores', E'Clientes Habituales: 3%\nContado: +8% (el 3% + el 8%)\nPlazo Cheques: 30-60-90'),
  ('calefones_calderas',   E'Clientes Habituales: 3%\nContado: +8% (el 3% + el 8%)\nPlazo Cheques: 30-60-90'),
  ('anafes',               E'Clientes Habituales: 3%\nContado: +10% (el 3% + el 8%)\nPlazo Cheques: 30-60-90')
on conflict (categoria) do nothing;
