-- Marca cuándo se envió el aviso automático por WhatsApp a la parada (evita duplicados).
alter table public.logistica_diaria
  add column if not exists notificado_wa_at timestamptz;
