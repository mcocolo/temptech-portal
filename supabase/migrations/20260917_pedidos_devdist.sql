-- Vincula un pedido de distribuidor (concepto 'devoluciones_pendientes') con la
-- devolución pendiente que repone. Al entregarse el pedido, esa devolución se cierra.
alter table public.pedidos add column if not exists devdist_id uuid references public.devoluciones_distribuidor(id);
