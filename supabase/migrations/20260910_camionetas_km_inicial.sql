-- Km inicial (odómetro base) de la camioneta: se carga una vez al alta y no se modifica
alter table public.camionetas add column if not exists km_inicial numeric;
