-- Concepto del pedido de distribuidor.
-- 'devoluciones_pendientes' = lo entregado es contra mercadería que ingresó por
-- devoluciones (no es una venta nueva). NULL = venta normal.
alter table public.pedidos add column if not exists concepto text;
