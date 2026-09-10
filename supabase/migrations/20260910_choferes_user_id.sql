-- Vínculo del chofer con su usuario de login (rol chofer)
alter table public.choferes add column if not exists user_id uuid;
