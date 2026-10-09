-- Información relevante: filtro por fábrica + adjuntos (fotos)
alter table public.info_relevante add column if not exists fabrica text;      -- 'Obon' | 'Darragueira' | null (general)
alter table public.info_relevante add column if not exists adjuntos jsonb not null default '[]'::jsonb;
