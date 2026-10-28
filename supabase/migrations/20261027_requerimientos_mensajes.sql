-- Requerimientos: hilo de mensajes (ida y vuelta). El estado 'cumplido' lo decide solo el creador.
alter table public.requerimientos add column if not exists mensajes jsonb not null default '[]'::jsonb;  -- [{ autor, autor_id, texto, fecha }]
