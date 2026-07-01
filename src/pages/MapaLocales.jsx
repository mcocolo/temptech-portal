import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const LOGO_URL = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagen-Corporativa/Temptech_icono.png'

export default function MapaLocales() {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const [locales, setLocales]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro]     = useState('todos')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, razon_social, full_name, telefono, web, user_type, direcciones_entrega')
      .in('user_type', ['distributor', 'tecnico'])
      .neq('aprobado', false)

    // Expandir cada local comercial como un pin separado
    const pins = []
    for (const perfil of (data || [])) {
      const nombre = perfil.razon_social || perfil.full_name || '—'
      for (const local of (perfil.direcciones_entrega || [])) {
        if (!local.lat || !local.lng) continue
        pins.push({
          id: `${perfil.id}_${pins.length}`,
          nombre,
          user_type: perfil.user_type,
          web: perfil.web,
          direccion: local.direccion || '',
          localidad: local.localidad || '',
          provincia: local.provincia || '',
          codigo_postal: local.codigo_postal || '',
          telefono: local.telefono || perfil.telefono || '',
          horario: local.horario || '',
          lat: parseFloat(local.lat),
          lng: parseFloat(local.lng),
        })
      }
    }
    setLocales(pins)
    setLoading(false)
  }

  useEffect(() => {
    if (loading || !mapRef.current) return
    const L = window.L
    if (!L) return

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([-38, -63], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance.current)
    }

    const map = mapInstance.current
    map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer) })

    const icon = L.divIcon({
      html: `<div style="width:36px;height:36px;border-radius:50%;background:#fff;border:2.5px solid #e8215a;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <img src="${LOGO_URL}" style="width:24px;height:24px;object-fit:contain;" />
      </div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -38],
    })

    const activos = locales.filter(l => {
      if (filtro === 'distribuidor' && l.user_type !== 'distributor') return false
      if (filtro === 'tecnico'     && l.user_type !== 'tecnico')      return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        return (l.razon_social || '').toLowerCase().includes(q)
          || (l.localidad || '').toLowerCase().includes(q)
          || (l.provincia || '').toLowerCase().includes(q)
      }
      return true
    })

    activos.filter(l => l.lat && l.lng).forEach(local => {
      const nombre  = local.razon_social || local.full_name || '—'
      const tipo    = local.user_type === 'distributor' ? '🏪 Distribuidor' : '🔧 Service Técnico'
      const dir     = [local.domicilio, local.localidad, local.provincia].filter(Boolean).join(', ')
      const webLink = local.web
        ? `<div style="margin-top:6px">🌐 <a href="${local.web.startsWith('http') ? local.web : 'https://' + local.web}" target="_blank" style="color:#2563eb">${local.web.replace(/^https?:\/\//, '')}</a></div>`
        : ''
      const popup = `
        <div style="font-family:system-ui,sans-serif;min-width:190px">
          <div style="font-weight:700;font-size:14px;margin-bottom:3px">${nombre}</div>
          <div style="font-size:11px;font-weight:600;color:${local.user_type === 'distributor' ? '#e8920a' : '#2563eb'};margin-bottom:8px;text-transform:uppercase">${tipo}</div>
          ${dir ? `<div style="font-size:12px;margin-bottom:4px">📍 ${dir}</div>` : ''}
          ${local.telefono ? `<div style="font-size:12px;margin-bottom:4px">📞 <a href="tel:${local.telefono}" style="color:#2563eb">${local.telefono}</a></div>` : ''}
          ${local.transporte ? `<div style="font-size:12px;color:#555;margin-bottom:4px">🕐 ${local.transporte}</div>` : ''}
          ${webLink}
        </div>`
      L.marker([local.lat, local.lng], { icon }).addTo(map).bindPopup(popup)
    })

    const conCoords = activos.filter(l => l.lat && l.lng)
    if (conCoords.length > 0) {
      const bounds = L.latLngBounds(conCoords.map(l => [l.lat, l.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    }
  }, [locales, filtro, busqueda, loading])

  useEffect(() => {
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [])

  const filtrados = locales.filter(l => {
    if (filtro === 'distribuidor' && l.user_type !== 'distributor') return false
    if (filtro === 'tecnico'     && l.user_type !== 'tecnico')      return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (l.razon_social || '').toLowerCase().includes(q)
        || (l.localidad || '').toLowerCase().includes(q)
        || (l.provincia || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Locales & Service</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Encontrá distribuidores y servicios técnicos TEMPTECH cerca tuyo</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre, ciudad o provincia..."
          style={{ flex: 1, minWidth: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }}
        />
        {[['todos','📍 Todos'],['distribuidor','🏪 Distribuidores'],['tecnico','🔧 Service']].map(([f,lbl]) => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            background: filtro === f ? 'rgba(232,33,90,0.12)' : 'var(--surface)',
            color: filtro === f ? '#e8215a' : 'var(--text3)',
            border: filtro === f ? '1px solid rgba(232,33,90,0.4)' : '1px solid var(--border)',
          }}>{lbl}</button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      <div ref={mapRef} style={{ height: 500, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 24, background: 'var(--surface)' }} />

      {!loading && filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 14 }}>No hay locales cargados aún.</div>
      )}

      {!loading && filtrados.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {filtrados.map(local => (
            <div key={local.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{local.razon_social || local.full_name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: local.user_type === 'distributor' ? '#fb923c' : '#7b9fff', marginBottom: 8 }}>
                {local.user_type === 'distributor' ? '🏪 Distribuidor' : '🔧 Service'}
              </div>
              {local.domicilio && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>📍 {local.domicilio}{local.localidad ? `, ${local.localidad}` : ''}</div>}
              {local.telefono  && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>📞 {local.telefono}</div>}
              {local.transporte && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>🕐 {local.transporte}</div>}
              {local.web && (
                <a href={local.web.startsWith('http') ? local.web : `https://${local.web}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: '#7b9fff', textDecoration: 'none', fontWeight: 600 }}>
                  🌐 {local.web.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
