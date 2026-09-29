-- Ventas de Página Web con múltiples entregas (distintos domicilios en una misma venta).
-- Cada entrega = un domicilio + sus productos. Al traer a Logística Diaria, cada
-- entrega se convierte en su propia parada.

-- Array de entregas: [{ direccion, localidad, zona, telefono, dni, items:[{codigo,nombre,cantidad}] }]
alter table public.ventas
  add column if not exists entregas jsonb;

-- Qué entrega de la venta representa esta parada (0-based). NULL = venta sin split (legacy).
alter table public.logistica_diaria
  add column if not exists entrega_idx integer;
