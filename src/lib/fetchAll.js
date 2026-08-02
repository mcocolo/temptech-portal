// Trae TODAS las filas de una consulta Supabase en páginas.
// Supabase/PostgREST devuelve como máximo 1000 filas por request; con tablas
// grandes eso "corta" datos silenciosamente (pasó con los distribuidores).
//
// Uso: await fetchAllRows(() => supabase.from('x').select('...').order('...').eq(...))
// IMPORTANTE: pasar una FUNCIÓN que construye la consulta de cero cada vez
// (se le agrega .range() en cada página).
export async function fetchAllRows(buildQuery, pageSize = 1000) {
  let desde = 0
  let todo = []
  for (;;) {
    const { data, error } = await buildQuery().range(desde, desde + pageSize - 1)
    if (error || !data) break
    todo = todo.concat(data)
    if (data.length < pageSize) break
    desde += pageSize
  }
  return todo
}
