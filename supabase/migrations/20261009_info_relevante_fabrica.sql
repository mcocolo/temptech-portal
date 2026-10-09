-- Información relevante: filtro por fábrica + adjuntos (fotos)
alter table public.info_relevante add column if not exists fabrica text;      -- 'Obon' | 'Darragueira' | null (general)
alter table public.info_relevante add column if not exists adjuntos jsonb not null default '[]'::jsonb;
alter table public.info_relevante add column if not exists vehiculos jsonb not null default '[]'::jsonb;  -- nombres de vehículos de la flota relacionados
