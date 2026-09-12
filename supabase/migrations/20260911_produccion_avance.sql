-- Avance parcial por etapa dentro de cada lote: { "pintura": 230, "corte": 384, ... }
alter table public.produccion_lotes add column if not exists avance jsonb not null default '{}';
