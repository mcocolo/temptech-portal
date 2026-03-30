import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, MessageSquare, AlertTriangle, Video,
  BookOpen, Newspaper, ClipboardList, LogOut, Menu, X,
  Shield, Bell
} from 'lucide-react'

const LOGO_URL = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagen-Corporativa/Temptech_LogoHorizontal.png'

const NAV = [
  { section: 'Principal' },
  { label: 'Panel',             icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Novedades',         icon: Newspaper,       path: '/novedades' },
  { section: 'Comunidad' },
  { label: 'Foro de Consultas', icon: MessageSquare,   path: '/foro' },
  { label: 'Reclamos',          icon: AlertTriangle,   path: '/reclamos' },
  { section: 'Recursos' },
  { label: 'Videos',            icon: Video,           path: '/videos' },
  { label: 'Manuales',          icon: BookOpen,        path: '/manuales' },
  { section: 'Mi Cuenta' },
  { label: 'Mis Consultas',     icon: ClipboardList,   path: '/mis-consultas' },
]

const ADMIN_NAV = [
  { section: 'Administración' },
  { label: 'Panel Admin', icon: Shield, path: '/admin', isAdmin: true },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut, isAdmin } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const allNav = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV

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
      <aside style={{
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

        {/* User pill */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
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
              <div style={{ fontSize: 11, color: isAdmin ? '#7b9fff' : 'var(--text3)' }}>
                {isAdmin ? '⭐ Admin' : 'Cliente'}
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
      <div style={{ marginLeft: 228, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

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
            <button style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text2)', transition: 'all .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-blue)'; e.currentTarget.style.color = 'var(--brand-blue)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
            >
              <Bell size={15} />
            </button>
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
        }
      `}</style>
    </div>
  )
}
