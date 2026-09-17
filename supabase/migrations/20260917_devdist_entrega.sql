-- Fecha, modo de entrega y código de operación de la devolución del distribuidor
--   modo_entrega: 'logistica' (la retiramos nosotros → Logística Diaria) | 'fabrica' (la traen / ya la trajeron)
--   estado: 'pendiente' | 'revisado' | 'resuelto' (cerrada al entregarse la reposición)
alter table public.devoluciones_distribuidor add column if not exists fecha_devolucion date;
alter table public.devoluciones_distribuidor add column if not exists modo_entrega text default 'fabrica';
alter table public.devoluciones_distribuidor add column if not exists codigo text;
alter table public.devoluciones_distribuidor add column if not exists resuelto_por text;
alter table public.devoluciones_distribuidor add column if not exists resuelto_at timestamptz;

-- Código de operación autogenerado tipo DV-0001
create sequence if not exists public.devdist_codigo_seq;
alter table public.devoluciones_distribuidor
  alter column codigo set default ('DV-' || lpad(nextval('public.devdist_codigo_seq')::text, 4, '0'));

-- Backfill de las filas existentes sin código
update public.devoluciones_distribuidor
  set codigo = 'DV-' || lpad(nextval('public.devdist_codigo_seq')::text, 4, '0')
  where codigo is null;
