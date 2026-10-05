-- N° de presupuesto secuencial, para identificarlos y nombrar los PDF (N° + Empresa).
alter table public.presupuestos
  add column if not exists numero integer;

-- Backfill: numerar los existentes por orden de creación
with ord as (
  select id, row_number() over (order by created_at) as rn from public.presupuestos
)
update public.presupuestos p set numero = ord.rn
  from ord where ord.id = p.id and p.numero is null;

-- Secuencia para los nuevos (arranca después del máximo actual)
create sequence if not exists presupuestos_numero_seq;
select setval('presupuestos_numero_seq', coalesce((select max(numero) from public.presupuestos), 0));
alter table public.presupuestos alter column numero set default nextval('presupuestos_numero_seq');
