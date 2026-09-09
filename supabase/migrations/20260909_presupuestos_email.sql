-- Agrega el email del cliente a los presupuestos (para enviar/reenviar por email)
alter table public.presupuestos
  add column if not exists cliente_email text;
