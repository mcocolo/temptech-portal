-- Pausas de la jornada de producción (desayuno, descansos, almuerzo).
-- Las OT (Corte, Alambre, Taller) descuentan estas pausas del cálculo de duración.
create table if not exists public.pausas_produccion (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  desde  text not null,   -- 'HH:MM'
  hasta  text not null,   -- 'HH:MM'
  activo boolean not null default true,
  orden  int not null default 0
);

alter table public.pausas_produccion enable row level security;
drop policy if exists pausas_all on public.pausas_produccion;
create policy pausas_all on public.pausas_produccion for all to authenticated using (true) with check (true);

-- Seed inicial (solo si está vacía)
insert into public.pausas_produccion (nombre, desde, hasta, orden)
select * from (values
  ('Desayuno', '09:00', '09:15', 1),
  ('Descanso', '11:00', '11:05', 2),
  ('Almuerzo', '13:00', '13:30', 3),
  ('Descanso', '15:00', '15:05', 4)
) as v(nombre, desde, hasta, orden)
where not exists (select 1 from public.pausas_produccion);
