-- Marca si ya se descontó el stock al enviar un pedido de repuestos (evita doble descuento).
alter table public.pedidos_repuestos
  add column if not exists stock_descontado boolean not null default false;
