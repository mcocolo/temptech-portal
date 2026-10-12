-- Reposiciones de caja (sumar dinero a una caja existente, con historial)
create table if not exists public.caja_reposiciones (
  id uuid primary key default gen_random_uuid(),
  caja_id uuid not null references public.caja_diaria(id) on delete cascade,
  monto numeric not null default 0,
  fecha date not null default current_date,
  nota text,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.caja_reposiciones enable row level security;
drop policy if exists caja_reposiciones_all on public.caja_reposiciones;
create policy caja_reposiciones_all on public.caja_reposiciones for all to authenticated using (true) with check (true);
create index if not exists idx_caja_repos_caja on public.caja_reposiciones(caja_id);

-- Registro general de gastos. medio_pago: 'caja' | 'transferencia_mp' | 'propio'
create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  descripcion text not null,
  monto numeric not null default 0,
  factura_a boolean not null default false,
  pagado_por text,
  medio_pago text not null default 'caja',
  caja_id uuid references public.caja_diaria(id) on delete set null,   -- sólo cuando medio_pago = 'caja'
  comprobante_url text,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.gastos enable row level security;
drop policy if exists gastos_all on public.gastos;
create policy gastos_all on public.gastos for all to authenticated using (true) with check (true);
create index if not exists idx_gastos_caja on public.gastos(caja_id);
create index if not exists idx_gastos_medio on public.gastos(medio_pago);

-- Migrar lo que hubiera en caja_gastos a la tabla general, y descartarla
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'caja_gastos') then
    insert into public.gastos (id, fecha, descripcion, monto, factura_a, pagado_por, medio_pago, caja_id, comprobante_url, created_by, created_at)
    select id, fecha, descripcion, monto, factura_a, pagado_por, 'caja', caja_id, comprobante_url, created_by, created_at
    from public.caja_gastos
    on conflict (id) do nothing;
    drop table public.caja_gastos;
  end if;
end $$;
