import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { Upload, RefreshCw, FileText, Check, AlertTriangle } from 'lucide-react'

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

const CATEGORIAS = {
  calefones_calderas: 'Calefones / Calderas',
  paneles_calefactores: 'Paneles Calefactores',
  anafes: 'Anafes',
}

const CSV_EJEMPLO = `codigo,nombre,modelo,precio,categoria
KF70SIL,Calefón Eléctrico One,3.5/5.5/7Kw 220V Silver,165585.15,calefones_calderas
C250STV1,Panel Calefactor Slim,250w,39293.46,paneles_calefactores`

function parsearCSV(texto) {
  const lineas = texto.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lineas.length < 2) throw new Error('El archivo está vacío')

  const header = lineas[0].toLowerCase().split(',').map(h => h.trim())
  const requeridos = ['codigo', 'nombre', 'modelo', 'precio', 'categoria']
  const faltantes = requeridos.filter(r => !header.includes(r))
  if (faltantes.length > 0) throw new Error(`Columnas faltantes: ${faltantes.join(', ')}`)

  const idx = {}
  requeridos.forEach(r => { idx[r] = header.indexOf(r) })

  const filas = []
  const errores = []

  lineas.slice(1).forEach((linea, i) => {
    const cols = linea.split(',').map(c => c.trim())
    const codigo = cols[idx.codigo]
    const nombre = cols[idx.nombre]
    const modelo = cols[idx.modelo]
    const precioRaw = cols[idx.precio]?.replace(/\s/g, '')
    const categoria = cols[idx.categoria]

    if (!codigo) { errores.push(`Fila ${i + 2}: código vacío`); return }
    const precio = parseFloat(precioRaw?.replace(',', '.'))
    if (isNaN(precio) || precio <= 0) { errores.push(`Fila ${i + 2} (${codigo}): precio inválido "${precioRaw}"`); return }
    if (!CATEGORIAS[categoria]) { errores.push(`Fila ${i + 2} (${codigo}): categoría inválida "${categoria}"`); return }

    filas.push({ codigo, nombre, modelo, precio, categoria })
  })

  return { filas, errores }
}

export default function AdminPrecios() {
  const { isAdmin, isVendedor } = useAuth()
  const [precios, setPrecios] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroCat, setFiltroCat] = useState('todos')
  const [preview, setPreview] = useState(null)   // { filas, errores }
  const [subiendo, setSubiendo] = useState(false)
  const [editando, setEditando] = useState(null) // { codigo, precio, nombre, modelo }
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ codigo: '', nombre: '', modelo: '', precio: '', categoria: 'paneles_calefactores', ean: '' })
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)
  const fileRef = useRef()

  useEffect(() => { if (isAdmin || isVendedor) cargar() }, [isAdmin, isVendedor])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase.from('precios').select('*').order('categoria').order('nombre')
    if (error) toast.error('Error al cargar precios')
    else setPrecios(data || [])
    setLoading(false)
  }

  function handleArchivo(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { toast.error('Solo se aceptan archivos .csv'); return }

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const resultado = parsearCSV(ev.target.result)
        setPreview(resultado)
      } catch (err) {
        toast.error(err.message)
      }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  async function confirmarSubida() {
    if (!preview?.filas?.length) return
    setSubiendo(true)

    const upserts = preview.filas.map(f => ({
      ...f,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('precios').upsert(upserts, { onConflict: 'codigo' })
    if (error) {
      toast.error('Error al guardar: ' + error.message)
      setSubiendo(false)
      return
    }

    toast.success(`${preview.filas.length} productos actualizados ✅`)
    setPreview(null)
    setSubiendo(false)
    cargar()
  }

  async function guardarPrecioIndividual() {
    const precio = parseFloat(editando.precio.replace(',', '.'))
    if (isNaN(precio) || precio <= 0) { toast.error('Precio inválido'); return }
    if (!editando.nombre?.trim()) { toast.error('El nombre no puede estar vacío'); return }

    const { error } = await supabase.from('precios').update({
      precio,
      nombre: editando.nombre.trim(),
      modelo: editando.modelo?.trim() || '',
      updated_at: new Date().toISOString()
    }).eq('codigo', editando.codigo)
    if (error) { toast.error('Error al guardar'); return }

    toast.success('Producto actualizado ✅')
    setEditando(null)
    cargar()
  }

  async function guardarNuevoProducto() {
    const { codigo, nombre, modelo, precio, categoria } = nuevoForm
    if (!codigo.trim()) return toast.error('Ingresá el código')
    if (!nombre.trim()) return toast.error('Ingresá el nombre')
    const precioNum = parseFloat(precio.replace(',', '.'))
    if (isNaN(precioNum) || precioNum <= 0) return toast.error('Precio inválido')
    setGuardandoNuevo(true)
    const { error } = await supabase.from('precios').upsert(
      [{ codigo: codigo.trim().toUpperCase(), nombre: nombre.trim(), modelo: modelo.trim(), precio: precioNum, categoria, ean: nuevoForm.ean.trim() || null, updated_at: new Date().toISOString() }],
      { onConflict: 'codigo' }
    )
    setGuardandoNuevo(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Producto agregado ✅')
    setModalNuevo(false)
    setNuevoForm({ codigo: '', nombre: '', modelo: '', precio: '', categoria: 'paneles_calefactores', ean: '' })
    cargar()
  }

  const preciosFiltrados = filtroCat === 'todos' ? precios : precios.filter(p => p.categoria === filtroCat)

  if (!isAdmin && !isVendedor) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Lista de Precios</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Actualizá los precios del catálogo subiendo un CSV</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={cargar}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}
          >
            <RefreshCw size={13} /> Actualizar
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setModalNuevo(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                + Agregar producto
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--brand-gradient)', border: 'none', borderRadius: 'var(--radius)', padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                <Upload size={14} /> Subir CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleArchivo} style={{ display: 'none' }} />
            </>
          )}
        </div>
      </div>

      {/* Instrucciones CSV — solo admin */}
      {isAdmin && <div style={{ background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <FileText size={14} color="#7b9fff" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7b9fff' }}>Formato del CSV</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
          El archivo debe tener estas columnas (en cualquier orden). Las categorías válidas son: <code style={{ color: '#7b9fff' }}>calefones_calderas</code>, <code style={{ color: '#7b9fff' }}>paneles_calefactores</code>, <code style={{ color: '#7b9fff' }}>anafes</code>
        </div>
        <pre style={{ fontSize: 11, background: 'var(--surface2)', padding: '10px 14px', borderRadius: 8, color: 'var(--text2)', overflow: 'auto', margin: 0, lineHeight: 1.7 }}>
          {CSV_EJEMPLO}
        </pre>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
          💡 En Excel: <strong>Archivo → Guardar como → CSV UTF-8 (delimitado por comas)</strong>. El precio debe usar punto como decimal (ej: <code>165585.15</code>).
        </div>
      </div>}

      {/* Preview CSV */}
      {preview && (
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: 'rgba(251,146,60,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Vista previa del CSV</span>
              <span style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.3)', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                {preview.filas.length} productos
              </span>
              {preview.errores.length > 0 && (
                <span style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.3)', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                  {preview.errores.length} errores
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPreview(null)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Cancelar
              </button>
              <button
                onClick={confirmarSubida}
                disabled={subiendo || preview.filas.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '6px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                <Check size={13} /> {subiendo ? 'Guardando...' : 'Confirmar y actualizar'}
              </button>
            </div>
          </div>

          {/* Errores */}
          {preview.errores.length > 0 && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(255,85,119,0.04)' }}>
              {preview.errores.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ff5577', marginBottom: 4 }}>
                  <AlertTriangle size={12} /> {e}
                </div>
              ))}
            </div>
          )}

          {/* Tabla preview */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Código', 'Nombre', 'Modelo', 'Categoría', 'Precio'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', color: 'var(--text3)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.filas.map((f, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 16px', fontFamily: 'monospace', color: '#7b9fff' }}>{f.codigo}</td>
                    <td style={{ padding: '8px 16px', fontWeight: 600 }}>{f.nombre}</td>
                    <td style={{ padding: '8px 16px', color: 'var(--text3)' }}>{f.modelo}</td>
                    <td style={{ padding: '8px 16px' }}>
                      <span style={{ fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4, color: 'var(--text3)' }}>
                        {CATEGORIAS[f.categoria] || f.categoria}
                      </span>
                    </td>
                    <td style={{ padding: '8px 16px', fontWeight: 700, color: '#3dd68c' }}>{formatPrecio(f.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filtro categorías */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['todos', 'Todos'], ...Object.entries(CATEGORIAS)].map(([key, label]) => (
          <button key={key} onClick={() => setFiltroCat(key)} style={{
            padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            background: filtroCat === key ? 'rgba(74,108,247,0.15)' : 'var(--surface)',
            color: filtroCat === key ? '#7b9fff' : 'var(--text3)',
            border: filtroCat === key ? '1px solid rgba(74,108,247,0.4)' : '1px solid var(--border)',
          }}>{label}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>
          {preciosFiltrados.length} productos
        </span>
      </div>

      {/* Tabla de precios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando precios...</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Código', 'EAN', 'Nombre', 'Modelo', 'Categoría', 'Precio', 'Actualizado', ...(isAdmin ? [''] : [])].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text3)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preciosFiltrados.map((p, i) => (
                  <tr key={p.codigo} style={{ borderBottom: i < preciosFiltrados.length - 1 ? '1px solid var(--border)' : 'none', background: editando?.codigo === p.codigo ? 'rgba(74,108,247,0.04)' : 'transparent' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#7b9fff' }}>{p.codigo}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>{p.ean || '—'}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                      {editando?.codigo === p.codigo ? (
                        <input
                          type="text"
                          value={editando.nombre}
                          onChange={e => setEditando(prev => ({ ...prev, nombre: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') guardarPrecioIndividual(); if (e.key === 'Escape') setEditando(null) }}
                          autoFocus
                          style={{ width: '100%', minWidth: 160, background: 'var(--surface3)', border: '1px solid rgba(74,108,247,0.5)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', fontWeight: 600 }}
                        />
                      ) : p.nombre}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text3)', fontSize: 12 }}>
                      {editando?.codigo === p.codigo ? (
                        <input
                          type="text"
                          value={editando.modelo}
                          onChange={e => setEditando(prev => ({ ...prev, modelo: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') guardarPrecioIndividual(); if (e.key === 'Escape') setEditando(null) }}
                          style={{ width: '100%', minWidth: 120, background: 'var(--surface3)', border: '1px solid rgba(74,108,247,0.5)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)' }}
                        />
                      ) : p.modelo}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {CATEGORIAS[p.categoria] || p.categoria}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {editando?.codigo === p.codigo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--text3)', fontSize: 12 }}>$</span>
                          <input
                            type="text"
                            value={editando.precio}
                            onChange={e => setEditando(prev => ({ ...prev, precio: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') guardarPrecioIndividual(); if (e.key === 'Escape') setEditando(null) }}
                            style={{ width: 120, background: 'var(--surface3)', border: '1px solid rgba(74,108,247,0.5)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                          />
                        </div>
                      ) : (
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{formatPrecio(p.precio)}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text3)', fontSize: 11 }}>
                      {p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {isAdmin && editando?.codigo === p.codigo ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={guardarPrecioIndividual} style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            Guardar
                          </button>
                          <button onClick={() => setEditando(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            ✕
                          </button>
                        </div>
                      ) : isAdmin ? (
                        <button
                          onClick={() => setEditando({ codigo: p.codigo, precio: p.precio.toString(), nombre: p.nombre, modelo: p.modelo || '' })}
                          style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#7b9fff'; e.currentTarget.style.color = '#7b9fff' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}
                        >
                          Editar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR PRODUCTO */}
      {modalNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460 }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>+ Agregar producto</div>
              <button onClick={() => setModalNuevo(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'codigo',   label: 'Código *',   placeholder: 'Ej: F1400MB' },
                { key: 'ean',      label: 'EAN / Barcode', placeholder: 'Ej: 0610985267062' },
                { key: 'nombre',   label: 'Nombre *',   placeholder: 'Ej: Panel Calefactor Firenze' },
                { key: 'modelo',   label: 'Modelo',     placeholder: 'Ej: 1400w Madera Blanca' },
                { key: 'precio',   label: 'Precio * (sin IVA)', placeholder: 'Ej: 78990' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input
                    value={nuevoForm[f.key]}
                    onChange={e => setNuevoForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Categoría *</label>
                <select
                  value={nuevoForm.categoria}
                  onChange={e => setNuevoForm(prev => ({ ...prev, categoria: e.target.value }))}
                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }}
                >
                  {Object.entries(CATEGORIAS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={guardarNuevoProducto} disabled={guardandoNuevo}
                  style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: guardandoNuevo ? 'not-allowed' : 'pointer', opacity: guardandoNuevo ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardandoNuevo ? 'Guardando...' : '✓ Guardar producto'}
                </button>
                <button onClick={() => setModalNuevo(false)}
                  style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
