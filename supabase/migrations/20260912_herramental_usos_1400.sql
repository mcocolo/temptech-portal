-- El contador 1400w se divide en dos variantes: 1400w T y 1400w CT
alter table public.herramental add column if not exists usos_1400w_t  integer not null default 0;
alter table public.herramental add column if not exists usos_1400w_ct integer not null default 0;
