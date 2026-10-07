-- Permite marcar una devolución como "Entregada" a mano (sin pedido de reposición y sin tocar stock).
alter table public.devoluciones_distribuidor
  add column if not exists entregado_manual boolean not null default false,
  add column if not exists entregado_at timestamptz,
  add column if not exists entregado_por text;
