-- Cuando el chofer confirma la ENTREGA de una parada de cambio vinculada a un caso,
-- el caso pasa de "Resolucion" a "cerrado" y queda el registro en las notas.
create or replace function public.cerrar_caso_al_entregar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado_entrega is not null
     and (old.estado_entrega is null or old.estado_entrega is distinct from new.estado_entrega)
     and new.devolucion_id is not null
     and new.tipo in ('cambio_garantia', 'cambio_producto') then
    update public.devoluciones
      set estado = 'cerrado',
          notas = coalesce(notas || E'\n', '')
                  || to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI')
                  || ' - Logística: ENTREGADO · caso cerrado'
      where id = new.devolucion_id
        and estado = 'Resolucion';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cerrar_caso_al_entregar on public.logistica_diaria;
create trigger trg_cerrar_caso_al_entregar
  after update of estado_entrega on public.logistica_diaria
  for each row execute function public.cerrar_caso_al_entregar();
