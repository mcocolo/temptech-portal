import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Fuente única de catálogo/precios: la tabla `precios` (Lista de Precios).
// La estructura (nombres, modelos, precios, categorías) siempre sale de la base.
// El catálogo hardcodeado de cada página queda SOLO como semilla de respaldo,
// por si la base todavía no cargó o devuelve vacío.
// ─────────────────────────────────────────────────────────────────────────────

export const IMG = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagenes%20productos/'

export const CATEGORIAS_META = {
  calefones_calderas:   { label: 'Calefones / Calderas', emoji: '🚿' },
  paneles_calefactores: { label: 'Paneles Calefactores', emoji: '🔆' },
  anafes:               { label: 'Anafes',               emoji: '🔥' },
}

const ORDEN_CATEGORIAS = ['calefones_calderas', 'paneles_calefactores', 'anafes']

// Imagen por convención: {IMG}{codigo}.png (si no existe, el <img> hace onError)
export function imagenProducto(codigo) {
  return codigo ? `${IMG}${codigo}.png` : ''
}

// Convierte filas de la tabla `precios` en el catálogo agrupado por categoría,
// con el mismo shape que usan las páginas: { categoria, label, emoji, productos }
export function agruparCatalogo(rows) {
  const grupos = {}
  ;(rows || []).forEach(p => {
    const cat = p.categoria || 'otros'
    if (!grupos[cat]) grupos[cat] = []
    grupos[cat].push({
      codigo: p.codigo,
      nombre: p.nombre,
      modelo: p.modelo || '',
      precio: Number(p.precio) || 0,
      categoria: cat,
      ean: p.ean || '',
      imagen: imagenProducto(p.codigo),
    })
  })
  return Object.keys(grupos)
    .sort((a, b) => {
      const ia = ORDEN_CATEGORIAS.indexOf(a)
      const ib = ORDEN_CATEGORIAS.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    .map(cat => ({
      categoria: cat,
      label: CATEGORIAS_META[cat]?.label || cat,
      emoji: CATEGORIAS_META[cat]?.emoji || '📦',
      productos: grupos[cat],
    }))
}

// Hook: devuelve el catálogo agrupado desde la tabla `precios`.
// `seed` es el catálogo hardcodeado de respaldo (mismo shape) que se muestra
// mientras carga o si la base está vacía.
export function useCatalogo(seed = []) {
  const [catalogo, setCatalogo] = useState(seed)

  useEffect(() => {
    let activo = true
    supabase
      .from('precios')
      .select('codigo, nombre, modelo, precio, categoria, ean')
      .order('categoria')
      .order('nombre')
      .then(({ data, error }) => {
        if (!activo) return
        if (!error && data && data.length > 0) setCatalogo(agruparCatalogo(data))
        // si falla o viene vacío, se conserva la semilla
      })
    return () => { activo = false }
  }, [])

  return catalogo
}
