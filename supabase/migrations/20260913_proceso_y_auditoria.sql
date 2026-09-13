-- ══════════════════════════════════════════════════════════════
-- Usuario "proceso" + auditoría de carga/modificación en Producción
-- ══════════════════════════════════════════════════════════════

-- Permitir el rol 'proceso' (por si quedara el check original role in ('client','admin'))
alter table public.profiles drop constraint if exists profiles_role_check;

-- Acceso de login del empleado (usuario "proceso")
alter table public.empleados add column if not exists email   text;
alter table public.empleados add column if not exists user_id uuid;

-- Auditoría: quién modificó por última vez el lote (avances, no conformidades, etc.)
alter table public.produccion_lotes add column if not exists modificado_por    text;
alter table public.produccion_lotes add column if not exists modificado_por_at timestamptz;

-- Auditoría de la OT de Corte
alter table public.produccion_ot add column if not exists creado_por        text;
alter table public.produccion_ot add column if not exists modificado_por    text;
alter table public.produccion_ot add column if not exists modificado_por_at timestamptz;
