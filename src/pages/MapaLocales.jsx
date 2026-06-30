import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'

// Fix default marker icons (Leaflet + Vite issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const LOGO_URL = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagen-Corporativa/Temptech_icono.png'

const temptechIcon = L.divIcon({
  html: `<div style="
    width:38px;height:38px;border-radius:50%;
    background:#fff;
    border:2px solid #e8215a;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    overflow:hidden;
  ">
    <img src="${LOGO_URL}" style="width:26px;height:26px;object-fit:contain;" onerror="this.style.display='none';this.parentElement.innerHTML='<span style=font-size:16px>📍</span>'" />
  </div>`,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -40],
})

function FitBounds({ markers }) {
  const map = useMap()
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    }
  }, [markers])
  return null
}

export default function MapaLocales() {
  const [locales, setLocales] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos') // 'todos' | 'distribuidor' | 'tecnico'

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, razon_social, full_name, email, telefono, domicilio, localidad, provincia, web, lat, lng, user_type, transporte')
      .in('user_type', ['distributor', 'tecnico'])
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .eq('aprobado', true)
    setLocales(data || [])
    setLoading(false)
  }

  const busqLow = busqueda.toLowerCase()
  const filtrados = locales.filter(l => {
    if (filtro === 'distribuidor' && l.user_type !== 'distributor') return false
    if (filtro === 'tecnico' && l.user_type !== 'tecnico') return false
    if (busqueda) {
      return (
        (l.razon_social || '').toLowerCase().includes(busqLow) ||
        (l.localidad || '').toLowerCase().includes(busqLow) ||
        (l.provincia || '').toLowerCase().includes(busqLow)
      )
    }
    return true
  })

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Locales & Service</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Encontrá distribuidores y servicios técnicos TEMPTECH cerca tuyo</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre, ciudad o provincia..."
          style={{ flex: 1, minWidth: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }}
        />
        {['todos', 'distribuidor', 'tecnico'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            background: filtro === f ? 'rgba(232,33,90,0.12)' : 'var(--surface)',
            color: filtro === f ? '#e8215a' : 'var(--text3)',
            border: filtro === f ? '1px solid rgba(232,33,90,0.4)' : '1px solid var(--border)',
          }}>
            {f === 'todos' ? '📍 Todos' : f === 'distribuidor' ? '🏪 Distribuidores' : '🔧 Service'}
          </button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{filtrados.length} {filtrados.length === 1 ? 'resultado' : 'resultados'}</span>
      </div>

      {/* Mapa */}
      <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', height: 520, marginBottom: 24 }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--text3)', fontSize: 14 }}>
            Cargando mapa...
          </div>
        ) : (
          <MapContainer
            center={[-38, -63]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtrados.length > 0 && <FitBounds markers={filtrados} />}
            {filtrados.map(local => (
              <Marker key={local.id} position={[local.lat, local.lng]} icon={temptechIcon}>
                <Popup maxWidth={280}>
                  <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#111' }}>
                      {local.razon_social || local.full_name}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: local.user_type === 'distributor' ? '#e8920a' : '#2563eb', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {local.user_type === 'distributor' ? '🏪 Distribuidor' : '🔧 Service Técnico'}
                    </div>
                    {local.domicilio && (
                      <div style={{ fontSize: 12, marginBottom: 4, display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                        <span>📍</span><span>{local.domicilio}{local.localidad ? `, ${local.localidad}` : ''}{local.provincia ? `, ${local.provincia}` : ''}</span>
                      </div>
                    )}
                    {local.telefono && (
                      <div style={{ fontSize: 12, marginBottom: 4 }}>
                        📞 <a href={`tel:${local.telefono}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{local.telefono}</a>
                      </div>
                    )}
                    {local.transporte && (
                      <div style={{ fontSize: 12, marginBottom: 4, color: '#555' }}>
                        🕐 {local.transporte}
                      </div>
                    )}
                    {local.web && (
                      <div style={{ fontSize: 12, marginTop: 6 }}>
                        🌐 <a href={local.web.startsWith('http') ? local.web : `https://${local.web}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                          {local.web.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Lista debajo del mapa */}
      {!loading && filtrados.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtrados.map(local => (
            <div key={local.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{local.razon_social || local.full_name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: local.user_type === 'distributor' ? '#fb923c' : '#7b9fff', marginBottom: 8 }}>
                {local.user_type === 'distributor' ? '🏪 Distribuidor' : '🔧 Service'}
              </div>
              {local.domicilio && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>📍 {local.domicilio}{local.localidad ? `, ${local.localidad}` : ''}</div>}
              {local.telefono && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>📞 {local.telefono}</div>}
              {local.transporte && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>🕐 {local.transporte}</div>}
              {local.web && (
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  <a href={local.web.startsWith('http') ? local.web : `https://${local.web}`} target="_blank" rel="noreferrer" style={{ color: '#7b9fff', textDecoration: 'none', fontWeight: 600 }}>
                    🌐 {local.web.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 14 }}>
          No hay locales cargados en el mapa todavía.
        </div>
      )}
    </div>
  )
}
