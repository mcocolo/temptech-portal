-- ─────────────────────────────────────────────────────────────────────────────
-- Foro solo-lectura para clientes (refuerzo en la base de lo que ya está en UI).
-- Los clientes (profiles.user_type = 'client') no pueden crear posts ni replies.
-- Se usa una política RESTRICTIVE (se combina con AND sobre las permisivas
-- existentes, sin modificarlas). Admins, distribuidores y técnicos no se afectan.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: ¿el usuario actual es cliente?
-- SECURITY DEFINER para poder leer `profiles` sin depender de su RLS.
create or replace function public.es_cliente()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and user_type = 'client'
  );
$$;

create policy "clientes_no_crean_posts"
  on public.posts as restrictive for insert to public
  with check (not public.es_cliente());

create policy "clientes_no_crean_replies"
  on public.replies as restrictive for insert to public
  with check (not public.es_cliente());

-- ── ROLLBACK (por si algo se rompe) ──────────────────────────────────────────
-- drop policy if exists "clientes_no_crean_posts" on public.posts;
-- drop policy if exists "clientes_no_crean_replies" on public.replies;
-- drop function if exists public.es_cliente();
