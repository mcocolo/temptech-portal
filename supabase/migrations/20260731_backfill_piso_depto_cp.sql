-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill de datos que quedaron embebidos en texto mientras estuvo el parche.
-- Correr DESPUÉS de haber agregado las columnas (piso, departamento,
-- codigo_postal_entrega). Es idempotente: solo toca filas sin migrar.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Distribuidores: CP embebido en direccion_entrega ("calle, CP 1234")
update public.clientes
set codigo_postal_entrega = trim(substring(direccion_entrega from ', CP ([^,]+)$')),
    direccion_entrega     = trim(regexp_replace(direccion_entrega, ', CP [^,]+$', ''))
where (codigo_postal_entrega is null or codigo_postal_entrega = '')
  and direccion_entrega ~ ', CP [^,]+$';

-- 2) Reclamos: piso/departamento embebidos en direccion
--    ("Av. Corrientes 1234, Piso 3, Depto B")
update public.devoluciones
set piso          = trim(substring(direccion from ', Piso ([^,]+)')),
    departamento  = trim(substring(direccion from ', Depto ([^,]+)')),
    direccion     = trim(regexp_replace(direccion, ', (Piso|Depto) [^,]+', '', 'g'))
where piso is null
  and departamento is null
  and direccion ~ ', (Piso|Depto) ';
