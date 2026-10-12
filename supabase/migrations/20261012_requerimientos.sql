-- Requerimientos: pedidos que se asignan a uno o varios usuarios internos.
create table if not exists public.requerimientos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  detalle text,
  destinatarios jsonb not null default '[]'::jsonb,   -- [{ id, nombre }]
  estado text not null default 'pendiente',           -- 'pendiente' | 'cumplido'
  respuesta text,
  respondido_por text,
  respondido_at timestamptz,
  created_by text,
  created_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.requerimientos enable row level security;
drop policy if exists requerimientos_all on public.requerimientos;
create policy requerimientos_all on public.requerimientos for all to authenticated using (true) with check (true);
