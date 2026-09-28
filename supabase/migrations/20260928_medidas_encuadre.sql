-- Medidas objetivo del sector Encuadre (editables por admin2 / superadmin)
create table if not exists public.medidas_encuadre (
  clave text primary key,   -- '250w' | '500w' | '1400w_tapa' | '1400w_contratapa'
  valor text,
  updated_at timestamptz not null default now()
);
alter table public.medidas_encuadre enable row level security;
drop policy if exists medidas_encuadre_all on public.medidas_encuadre;
create policy medidas_encuadre_all on public.medidas_encuadre for all to authenticated using (true) with check (true);

insert into public.medidas_encuadre (clave, valor) values
  ('250w', '291x591 mm'),
  ('500w', '591x591 mm'),
  ('1400w_tapa', '560x560 mm'),
  ('1400w_contratapa', '558x558 mm')
on conflict (clave) do nothing;
