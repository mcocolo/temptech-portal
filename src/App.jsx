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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth"          element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/"              element={<Navigate to="/dashboard" replace />} />
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
