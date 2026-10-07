-- Unificar: TODAS las devoluciones del distribuidor viven en devoluciones_distribuidor.
-- Se agregan motivo (tipo) y referencia de pedido, y se migran las que estaban en 'devoluciones'.

alter table public.devoluciones_distribuidor
  add column if not exists tipo text,
  add column if not exists pedido_referencia text;

-- Mover las devoluciones de distribuidores pendientes que estaban en la tabla vieja
insert into public.devoluciones_distribuidor
  (distribuidor_id, origen, items, notas, tipo, pedido_referencia, modo_entrega, estado, creado_por, created_at)
select d.distribuidor_id, 'distribuidor', d.items, d.notas, d.tipo, d.pedido_referencia,
       'fabrica', 'pendiente',
       coalesce(p.razon_social, p.full_name, 'distribuidor'), d.created_at
from public.devoluciones d
left join public.profiles p on p.id = d.distribuidor_id
where d.distribuidor_id is not null and d.estado = 'pendiente';

-- Sacarlas de la lista "Pendiente" del flujo viejo (quedan marcadas como migradas)
update public.devoluciones set estado = 'migrado'
where distribuidor_id is not null and estado = 'pendiente';
