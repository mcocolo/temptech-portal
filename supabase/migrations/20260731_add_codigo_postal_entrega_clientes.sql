-- Distribuidores: código postal de la dirección de entrega como columna real.
-- Antes se embebía dentro de `direccion_entrega` ("calle, CP 1234"); ahora
-- queda en su propia columna.
alter table public.clientes
  add column if not exists codigo_postal_entrega text;
