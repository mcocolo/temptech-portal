-- RMA: distinguir cuánto NOS CUESTA (costo_total) vs cuánto se le COBRA al cliente.
alter table public.rma_costos
  add column if not exists cobrado numeric not null default 0,   -- monto facturado al cliente/distribuidor (0 = absorbido)
  add column if not exists paga text default 'absorbido';        -- 'cliente' | 'absorbido'
