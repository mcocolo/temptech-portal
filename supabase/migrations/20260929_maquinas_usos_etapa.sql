-- Uso de máquinas y herramental separado por etapa: Corte (250/500/1400 T/CT) y Encuadre (250/500)
alter table public.maquinas add column if not exists usos_corte_250w      integer not null default 0;
alter table public.maquinas add column if not exists usos_corte_500w      integer not null default 0;
alter table public.maquinas add column if not exists usos_corte_1400w_t   integer not null default 0;
alter table public.maquinas add column if not exists usos_corte_1400w_ct  integer not null default 0;
alter table public.maquinas add column if not exists usos_encuadre_250w   integer not null default 0;
alter table public.maquinas add column if not exists usos_encuadre_500w   integer not null default 0;

alter table public.herramental add column if not exists usos_corte_250w      integer not null default 0;
alter table public.herramental add column if not exists usos_corte_500w      integer not null default 0;
alter table public.herramental add column if not exists usos_corte_1400w_t   integer not null default 0;
alter table public.herramental add column if not exists usos_corte_1400w_ct  integer not null default 0;
alter table public.herramental add column if not exists usos_encuadre_250w   integer not null default 0;
alter table public.herramental add column if not exists usos_encuadre_500w   integer not null default 0;
