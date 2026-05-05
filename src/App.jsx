  import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import Auth from '@/pages/Auth'
import AuthCallback from '@/pages/AuthCallback'
import Dashboard from '@/pages/Dashboard'
import Foro from '@/pages/Foro'
import Reclamos from '@/pages/Reclamos'
import Videos from '@/pages/Videos'
import Manuales from '@/pages/Manuales'
import Novedades from '@/pages/Novedades'
import MisConsultas from '@/pages/MisConsultas'
import Admin from '@/pages/Admin'
import '@/styles/globals.css'
import RegistroProducto from '@/pages/RegistroProducto'
import ClientesRegistrados from '@/pages/ClientesRegistrados'
import Distribuidores from '@/pages/Distribuidores'
import Pedidos from '@/pages/Pedidos'
import AdminPedidos from '@/pages/AdminPedidos'
import AdminPrecios from '@/pages/AdminPrecios'
import AdminPreventas from '@/pages/AdminPreventas'
import ContenidoDigital from '@/pages/ContenidoDigital'
import MisClientes from '@/pages/MisClientes'
import Documentacion from '@/pages/Documentacion'
import EspecificacionesTecnicas from '@/pages/EspecificacionesTecnicas'
import IngresoEgresoPT from '@/pages/IngresoEgresoPT'
import PedidosCanal from '@/pages/PedidosCanal'
import LogisticaDiaria from '@/pages/LogisticaDiaria'
import Insumos from '@/pages/Insumos'
import AdminDevoluciones from '@/pages/AdminDevoluciones'
import AdminEgresoDevoluciones from '@/pages/AdminEgresoDevoluciones'
import Devoluciones from '@/pages/Devoluciones'
import PerfilDistribuidor from '@/pages/PerfilDistribuidor'
import IngresoTransito from '@/pages/IngresoTransito'
import MisPreventas from '@/pages/MisPreventas'
import AdminReportes from '@/pages/AdminReportes'



function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <img
        src="https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagen-Corporativa/Temptech_LogoHorizontal.png"
        alt="TEMPTECH"
        style={{ height: 36, objectFit: 'contain' }}
        onError={e => e.currentTarget.style.display = 'none'}
      />
      <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--brand-blue)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
  return user ? children : <Navigate to="/auth" replace />
}

function HomeRedirect() {
  const { isChofer, loading } = useAuth()
  if (loading) return null
  return <Navigate to={isChofer ? '/logistica' : '/dashboard'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth"          element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/"              element={<PrivateRoute><HomeRedirect /></PrivateRoute>} />
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="/foro"          element={<Foro />} />
              <Route path="/reclamos"      element={<Reclamos />} />
              <Route path="/videos"        element={<Videos />} />
              <Route path="/manuales"      element={<Manuales />} />
              <Route path="/novedades"     element={<Novedades />} />
              <Route path="/mis-consultas" element={<MisConsultas />} />
              <Route path="/admin"         element={<Admin />} />
              <Route path="/registro-producto" element={<RegistroProducto />} />
              <Route path="/clientes-registrados" element={<ClientesRegistrados />} />
              <Route path="/distribuidores" element={<Distribuidores />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/admin-pedidos" element={<AdminPedidos />} />
              <Route path="/admin-precios" element={<AdminPrecios />} />
              <Route path="/admin-preventas" element={<AdminPreventas />} />
              <Route path="/contenido-digital" element={<ContenidoDigital />} />
              <Route path="/mis-clientes"     element={<MisClientes />} />
              <Route path="/documentacion"               element={<Documentacion />} />
              <Route path="/especificaciones-tecnicas"  element={<EspecificacionesTecnicas />} />
              <Route path="/ingreso-egreso-pt"          element={<IngresoEgresoPT />} />
              <Route path="/logistica"                  element={<LogisticaDiaria />} />
              <Route path="/admin-devoluciones"             element={<AdminDevoluciones />} />
              <Route path="/egreso-devoluciones"            element={<AdminEgresoDevoluciones />} />
              <Route path="/devoluciones"                  element={<Devoluciones />} />
              <Route path="/mi-perfil"                     element={<PerfilDistribuidor />} />
              <Route path="/mis-preventas"               element={<MisPreventas />} />
              <Route path="/ingreso-transito/meli"         element={<IngresoTransito key="meli" />} />
              <Route path="/ingreso-transito/pagina"       element={<IngresoTransito key="pagina" />} />
              <Route path="/ingreso-transito/vo"           element={<IngresoTransito key="vo" />} />
              <Route path="/produccion/insumos-directos"   element={<Insumos />} />
              <Route path="/produccion/insumos-indirectos" element={<Insumos />} />
              <Route path="/reportes"                   element={<AdminReportes />} />
              <Route path="/pedidos-meli"              element={<PedidosCanal key="meli" />} />
              <Route path="/pedidos-pagina"            element={<PedidosCanal key="pagina" />} />
              <Route path="/pedidos-vo"                element={<PedidosCanal key="vo" />} />
              <Route path="*"              element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: 'var(--green)', secondary: '#000' } },
            error:   { iconTheme: { primary: 'var(--red)',   secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
