-- Estado de vida de la herramienta: activo | discontinuado (no se usa más, queda en registro)
-- | eliminado (disposición final: se tiró, pero queda en registro)
alter table public.herramental add column if not exists estado_vida text not null default 'activo';
alter table public.herramental add column if not exists estado_vida_at timestamptz;
alter table public.herramental add column if not exists estado_vida_por text;
