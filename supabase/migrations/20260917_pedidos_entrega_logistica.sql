-- Marca un pedido de distribuidor para entregarlo con Logística propia
-- (aparece en Logística Diaria → "Traer a logística")
alter table public.pedidos add column if not exists entrega_logistica boolean not null default false;
