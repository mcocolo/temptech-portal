-- Adjuntos (foto/remito) de la devolución de mercadería.
alter table public.devoluciones_distribuidor
  add column if not exists adjuntos jsonb not null default '[]'::jsonb;
