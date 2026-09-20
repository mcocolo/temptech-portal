-- Estado de vida de la máquina: activo | discontinuado (no se usa más, queda en registro)
-- | eliminado (disposición final: se dio de baja/tiró, pero queda en registro)
alter table public.maquinas add column if not exists estado_vida text not null default 'activo';
alter table public.maquinas add column if not exists estado_vida_at timestamptz;
alter table public.maquinas add column if not exists estado_vida_por text;
