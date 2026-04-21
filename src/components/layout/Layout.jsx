import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, MessageSquare, AlertTriangle, Video,
  BookOpen, Newspaper, ClipboardList, LogOut, Menu, X,
  Shield, Bell, Package, Users, Store, ShoppingCart, Tags,
  ShoppingBag, Wrench, Check, Ruler, BarChart2, Globe, Truck,
  Factory, ChevronDown, ChevronRight, Layers, Box
} from 'lucide-react'

const LOGO_URL = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagen-Corporativa/Temptech_LogoHorizontal.png'

const NAV = [
  { section: 'Principal' },
  { label: 'Panel',             icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Novedades',         icon: Newspaper,       path: '/novedades' },
  { section: 'Comunidad' },
  { label: 'Foro de Consultas', icon: MessageSquare,   path: '/foro' },
  { label: 'Service / Garantía', icon: AlertTriangle,   path: '/reclamos' },
  { section: 'Recursos' },
  { label: 'Videos',            icon: Video,           path: '/videos' },
  { label: 'Manuales',          icon: BookOpen,        path: '/manuales' },
  { label: 'Documentación',     icon: ClipboardList,   path: '/documentacion',     isDistributor: true },
  { label: 'Contenido Digital',          icon: Package,      path: '/contenido-digital',          isDistributor: true },
  { label: 'Especificaciones Técnicas',  icon: Ruler,        path: '/especificaciones-tecnicas' },
  { section: 'Mi Cuenta' },
  { label: 'Mis Consultas',     icon: ClipboardList,   path: '/mis-consultas' },
  { label: 'MIS TEMPTECH / Registrar', icon: Package, path: '/registro-producto' },
  { label: 'Mis Pedidos',       icon: ShoppingCart,    path: '/pedidos', isDistributor: true },
]

const ADMIN_NAV = [
  { section: 'Administración' },
  { label: 'Panel Admin', icon: Shield, path: '/admin', isAdmin: true },
  { label: 'Clientes Registrados', icon: Users, path: '/clientes-registrados', isAdmin: true },
  { label: 'Distribuidores', icon: Store, path: '/distribuidores', isAdmin: true },
  { label: 'Pedidos Distribuidores', icon: ShoppingCart, path: '/admin-pedidos', isAdmin: true },
  { label: 'Pedidos Meli',    icon: ShoppingBag, path: '/pedidos-meli',   isAdmin: true },
  { label: 'Pedidos Página',  icon: Globe,       path: '/pedidos-pagina', isAdmin: true },
  { label: 'Pedidos VO',      icon: Package,     path: '/pedidos-vo',     isAdmin: true },
  { label: 'Lista de Precios', icon: Tags, path: '/admin-precios', isAdmin: true },
  { label: 'Preventas',           icon: Package,    path: '/admin-preventas',    isAdmin: true },
  { label: 'Ingreso / Egreso PT', icon: BarChart2,  path: '/ingreso-egreso-pt',  isAdmin: true },
  { label: 'Logística Diaria',   icon: Truck,      path: '/logistica',          isAdmin: true },
  { section: 'Producción' },
  { label: 'Producción', icon: Factory, isAdmin: true, submenu: 'produccion', children: [
    { label: 'Insumos Directos',   icon: Layers, path: '/produccion/insumos-directos' },
    { label: 'Insumos Indirectos', icon: Box,    path: '/produccion/insumos-indirectos' },
  ]},
]

const ADMIN2_NAV = [
  { section: 'Gestión' },
  { label: 'Service / Garantía',  icon: AlertTriangle,  path: '/reclamos',          isAdmin: true },
  { label: 'Pedidos Distribuidores', icon: ShoppingCart, path: '/admin-pedidos',   isAdmin: true },
  { label: 'Pedidos Meli',        icon: ShoppingBag,   path: '/pedidos-meli',      isAdmin: true },
  { label: 'Pedidos Página',      icon: Globe,         path: '/pedidos-pagina',    isAdmin: true },
  { label: 'Pedidos VO',          icon: Package,       path: '/pedidos-vo',        isAdmin: true },
  { label: 'Ingreso / Egreso PT', icon: BarChart2,     path: '/ingreso-egreso-pt', isAdmin: true },
  { label: 'Logística Diaria',   icon: Truck,         path: '/logistica',         isAdmin: true },
  { section: 'Producción' },
  { label: 'Producción', icon: Factory, isAdmin: true, submenu: 'produccion', children: [
    { label: 'Insumos Directos',   icon: Layers, path: '/produccion/insumos-directos' },
    { label: 'Insumos Indirectos', icon: Box,    path: '/produccion/insumos-indirectos' },
  ]},
]

// Nav base para admin2
const NAV_ADMIN2 = [
  { section: 'Principal' },
  { label: 'Panel',             icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Novedades',         icon: Newspaper,       path: '/novedades' },
  { section: 'Comunidad' },
  { label: 'Foro de Consultas', icon: MessageSquare,   path: '/foro' },
  { section: 'Recursos' },
  { label: 'Videos',            icon: Video,           path: '/videos' },
  { label: 'Manuales',          icon: BookOpen,        path: '/manuales' },
  { label: 'Especificaciones Técnicas', icon: Ruler,   path: '/especificaciones-tecnicas' },
]

// Nav para vendedor
const NAV_VENDEDOR = [
  { section: 'Principal' },
  { label: 'Panel',             icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Novedades',         icon: Newspaper,       path: '/novedades' },
  { section: 'Gestión' },
  { label: 'Mis Clientes',      icon: Users,           path: '/mis-clientes' },
  { label: 'Service / Garantía', icon: AlertTriangle,   path: '/reclamos' },
  { label: 'Pedidos',           icon: ShoppingCart,    path: '/admin-pedidos' },
  { section: 'Recursos' },
  { label: 'Lista de Precios',  icon: Tags,            path: '/admin-precios' },
  { label: 'Videos',            icon: Video,           path: '/videos' },
  { label: 'Manuales',          icon: BookOpen,        path: '/manuales' },
  { label: 'Especificaciones Técnicas', icon: Ruler,   path: '/especificaciones-tecnicas' },
]

const NOTIF_ICONS = { pedido: '🛒', reclamo: '🔧', foro: '💬', preventa: '📦' }
const NOTIF_COLORS = { pedido: '#7b9fff', reclamo: '#fb923c', foro: '#3dd68c', preventa: '#a78bfa' }

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openSubmenus, setOpenSubmenus] = useState({ produccion: true })
  const { profile, signOut, isAdmin, isAdmin2, isVendedor, isDistributor } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  // Notificaciones (admin + admin2)
  const [notifs, setNotifs]           = useState([])
  const [showNotifs, setShowNotifs]   = useState(false)
  const notifRef                      = useRef(null)

  useEffect(() => {
    if (!isAdmin && !isAdmin2) return
    cargarNotifs()

    const channel = supabase
      .channel('notificaciones-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, payload => {
        setNotifs(prev => [payload.new, ...prev].slice(0, 50))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [isAdmin, isAdmin2])

  // Cerrar popup al hacer click afuera
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function cargarNotifs() {
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs(data || [])
  }

  async function marcarTodasLeidas() {
    await supabase.from('notificaciones').update({ leida: true }).eq('leida', false)
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
  }

  async function marcarLeida(id) {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  const unreadCount = notifs.filter(n => !n.leida).length

  function formatNotifTime(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'ahora'
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  }

  const baseNav = NAV.filter(item => !item.isDistributor || isDistributor || isAdmin)
  const allNav = isAdmin
    ? [...baseNav, ...ADMIN_NAV]
    : isAdmin2
    ? [...NAV_ADMIN2, ...ADMIN2_NAV]
    : isVendedor
    ? NAV_VENDEDOR
    : baseNav

  function handleNav(path) {
    navigate(path)
    setSidebarOpen(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 99, backdropFilter: 'blur(3px)',
        }} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={sidebarOpen ? 'open' : ''} style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 228,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        transition: 'transform .3s ease',
        overflow: 'hidden',
      }}>

        {/* Línea de gradiente TEMPTECH en el top */}
        <div style={{
          height: 3,
          background: 'var(--brand-gradient)',
          flexShrink: 0,
        }} />

        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(180deg, rgba(15,31,92,0.15) 0%, transparent 100%)',
        }}>
          <img
            src={LOGO_URL}
            alt="TEMPTECH"
            style={{
              width: '100%',
              maxWidth: 165,
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
              // Invertir para que se vea bien en fondo oscuro
              filter: 'brightness(0) invert(1)',
            }}
            onError={e => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextSibling.style.display = 'flex'
            }}
          />
          {/* Fallback texto */}
          <div style={{ display: 'none', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-gradient)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>TEMPTECH</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '2px', marginTop: 8, textTransform: 'uppercase' }}>
            Portal de Clientes
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {allNav.map((item, i) => {
            if (item.section) return (
              <div key={i} style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '1.2px',
                padding: '14px 20px 5px',
              }}>{item.section}</div>
            )

            // Submenu parent
            if (item.children) {
              const Icon = item.icon
              const isOpen = openSubmenus[item.submenu]
              const anyActive = item.children.some(c => location.pathname === c.path)
              return (
                <div key={item.submenu}>
                  <div
                    onClick={() => setOpenSubmenus(prev => ({ ...prev, [item.submenu]: !prev[item.submenu] }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 20px', cursor: 'pointer',
                      borderLeft: `3px solid ${anyActive ? 'var(--brand-blue)' : 'transparent'}`,
                      background: anyActive ? 'rgba(74,108,247,0.08)' : 'transparent',
                      color: anyActive ? '#7b9fff' : 'var(--text2)',
                      fontWeight: anyActive ? 600 : 400, fontSize: 13, transition: 'all .15s',
                    }}
                    onMouseEnter={e => { if (!anyActive) { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)' } }}
                    onMouseLeave={e => { if (!anyActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
                  >
                    <Icon size={15} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.isAdmin && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-gradient)', flexShrink: 0 }} />}
                    {isOpen ? <ChevronDown size={12} style={{ marginLeft: 2, opacity: 0.5 }} /> : <ChevronRight size={12} style={{ marginLeft: 2, opacity: 0.5 }} />}
                  </div>
                  {isOpen && item.children.map(child => {
                    const CIcon = child.icon
                    const cActive = location.pathname === child.path
                    return (
                      <div
                        key={child.path}
                        onClick={() => handleNav(child.path)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 20px 8px 36px', cursor: 'pointer',
                          borderLeft: `3px solid ${cActive ? 'var(--brand-blue)' : 'transparent'}`,
                          background: cActive ? 'rgba(74,108,247,0.1)' : 'transparent',
                          color: cActive ? '#7b9fff' : 'var(--text3)',
                          fontWeight: cActive ? 600 : 400, fontSize: 12, transition: 'all .15s',
                        }}
                        onMouseEnter={e => { if (!cActive) { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)' } }}
                        onMouseLeave={e => { if (!cActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
                      >
                        <CIcon size={13} />
                        <span>{child.label}</span>
                      </div>
                    )
                  })}
                </div>
              )
            }

            const active = location.pathname === item.path
            const Icon   = item.icon

            return (
              <div
                key={item.path}
                onClick={() => handleNav(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 20px', cursor: 'pointer',
                  borderLeft: `3px solid ${active ? 'var(--brand-blue)' : 'transparent'}`,
                  background: active ? 'rgba(74,108,247,0.1)' : 'transparent',
                  color: active ? '#7b9fff' : 'var(--text2)',
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                  transition: 'all .15s',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--surface3)'
                    e.currentTarget.style.color = 'var(--text)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text2)'
                  }
                }}
              >
                <Icon size={15} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.isAdmin && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--brand-gradient)',
                    flexShrink: 0,
                  }} />
                )}
              </div>
            )
          })}
        </nav>

        {/* Instagram banner */}
        <a
          href="https://www.instagram.com/temptecharg/"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none', display: 'block', padding: '12px 16px', borderTop: '1px solid var(--border)' }}
        >
          <div style={{
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            background: 'linear-gradient(135deg, rgba(225,48,108,0.15), rgba(193,53,132,0.1), rgba(88,81,219,0.15))',
            border: '1px solid rgba(225,48,108,0.25)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(225,48,108,0.5)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(225,48,108,0.25), rgba(193,53,132,0.15), rgba(88,81,219,0.25))' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(225,48,108,0.25)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(225,48,108,0.15), rgba(193,53,132,0.1), rgba(88,81,219,0.15))' }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f472b6' }}>@temptecharg</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>Seguinos en Instagram ↗</div>
            </div>
          </div>
        </a>

        {/* User pill */}
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            background: 'var(--surface2)', borderRadius: 'var(--radius)',
            padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
            border: '1px solid var(--border)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || 'Usuario'}
              </div>
              <div style={{ fontSize: 11, color: isAdmin ? '#7b9fff' : isAdmin2 ? '#fb923c' : 'var(--text3)' }}>
                {isAdmin ? '⭐ Admin' : isAdmin2 ? '📦 Control Físico' : 'Cliente'}
              </div>
            </div>
            <button
              onClick={signOut}
              title="Cerrar sesión"
              style={{ background: 'none', border: 'none', color: 'var(--text3)', padding: '4px', borderRadius: '6px', transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-content" style={{ marginLeft: 228, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(8,9,15,0.93)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 32px', height: 54,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mobile-menu-btn"
              style={{ display: 'none', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', color: 'var(--text)' }}
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {(isAdmin || isAdmin2) && (
              <div ref={notifRef} style={{ position: 'relative' }}>
                {/* Botón campana */}
                <button
                  onClick={() => setShowNotifs(v => !v)}
                  style={{
                    background: showNotifs ? 'rgba(74,108,247,0.15)' : 'var(--surface2)',
                    border: `1px solid ${showNotifs ? 'rgba(74,108,247,0.5)' : 'var(--border)'}`,
                    borderRadius: 8, width: 34, height: 34,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: showNotifs ? '#7b9fff' : 'var(--text2)', transition: 'all .15s',
                    cursor: 'pointer', position: 'relative',
                  }}
                  onMouseEnter={e => { if (!showNotifs) { e.currentTarget.style.borderColor = 'var(--brand-blue)'; e.currentTarget.style.color = 'var(--brand-blue)' } }}
                  onMouseLeave={e => { if (!showNotifs) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' } }}
                >
                  <Bell size={15} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      background: '#ff5577', color: '#fff',
                      fontSize: 9, fontWeight: 800,
                      width: 16, height: 16, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--bg)',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Popup notificaciones */}
                {showNotifs && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: 360, maxHeight: 480,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    zIndex: 200,
                  }}>
                    {/* Header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        Notificaciones
                        {unreadCount > 0 && (
                          <span style={{ marginLeft: 8, background: '#ff5577', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 20 }}>
                            {unreadCount} nuevas
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={marcarTodasLeidas}
                          style={{ background: 'none', border: 'none', color: '#7b9fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font)' }}
                        >
                          <Check size={11} /> Marcar leídas
                        </button>
                      )}
                    </div>

                    {/* Lista */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {notifs.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                          Sin notificaciones
                        </div>
                      ) : notifs.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            marcarLeida(n.id)
                            if (n.link) { navigate(n.link); setShowNotifs(false) }
                          }}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            padding: '12px 16px',
                            background: n.leida ? 'transparent' : 'rgba(74,108,247,0.05)',
                            borderBottom: '1px solid var(--border)',
                            cursor: n.link ? 'pointer' : 'default',
                            transition: 'background .15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = n.leida ? 'transparent' : 'rgba(74,108,247,0.05)' }}
                        >
                          {/* Icono */}
                          <div style={{
                            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                            background: `${NOTIF_COLORS[n.tipo] || '#7b9fff'}20`,
                            border: `1px solid ${NOTIF_COLORS[n.tipo] || '#7b9fff'}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16,
                          }}>
                            {NOTIF_ICONS[n.tipo] || '🔔'}
                          </div>

                          {/* Contenido */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: n.leida ? 400 : 600, lineHeight: 1.4, color: 'var(--text)' }}>
                              {n.mensaje}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                              {formatNotifTime(n.created_at)}
                            </div>
                          </div>

                          {/* Punto no leída */}
                          {!n.leida && (
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7b9fff', flexShrink: 0, marginTop: 4 }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '32px' }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          padding: '14px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <img
            src={LOGO_URL}
            alt="TEMPTECH"
            style={{ height: 18, objectFit: 'contain', opacity: 0.4, filter: 'brightness(0) invert(1)' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            © {new Date().getFullYear()} TEMPTECH · Portal de Atención al Cliente
          </div>
        </footer>
      </div>

      <style>{`
        @media (max-width: 768px) {
          aside { transform: translateX(-100%); }
          aside.open { transform: translateX(0) !important; }
          .mobile-menu-btn { display: flex !important; }
          .main-content { margin-left: 0 !important; }
          .main-content header { padding: 0 16px !important; }
          .main-content main { padding: 16px !important; }
          .main-content footer { padding: 12px 16px !important; flex-direction: column; gap: 6px; text-align: center; }
        }
      `}</style>
    </div>
  )
}
