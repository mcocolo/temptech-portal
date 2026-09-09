-- Notas que el cliente envía en un caso (append-only, cada línea con fecha/hora y autor)
alter table public.devoluciones
  add column if not exists notas_cliente text;
