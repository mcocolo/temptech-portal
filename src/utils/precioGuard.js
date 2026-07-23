// Guard global para ocultar importes a roles sin permiso comercial (admin2).
// El flag es el rol del usuario (constante durante la sesión), así que
// admin / vendedor / distribuidor / cliente nunca se ven afectados: para ellos
// preciosOcultos() siempre devuelve false y los precios se muestran normalmente.

let _ocultar = false

export function setOcultarPrecios(v) { _ocultar = !!v }
export function preciosOcultos() { return _ocultar }

export const MASK_PRECIO = '—'
