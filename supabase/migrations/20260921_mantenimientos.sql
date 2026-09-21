-- Registros de mantenimiento (correctivo / preventivo / predictivo)
create table if not exists public.mantenimientos (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null,                    -- 'correctivo' | 'preventivo' | 'predictivo'
  maquina_id   uuid references public.maquinas(id) on delete set null,
  objeto       text,                             -- equipo/objeto si no es una máquina cargada
  fecha        date not null,
  descripcion  text,
  realizado_por text,
  proximo      date,                             -- próximo mantenimiento (preventivo)
  costo        numeric,
  creado_por   text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_mant_maquina on public.mantenimientos (maquina_id);
create index if not exists idx_mant_fecha on public.mantenimientos (fecha);

alter table public.mantenimientos enable row level security;
drop policy if exists mantenimientos_all on public.mantenimientos;
create policy mantenimientos_all on public.mantenimientos for all to authenticated using (true) with check (true);
