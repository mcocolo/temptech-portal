-- Asegurar políticas RLS permisivas para logistica_diaria (insert/select/update/delete autenticados)
alter table public.logistica_diaria enable row level security;
do $$ begin
  create policy "logistica_diaria_all" on public.logistica_diaria for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
