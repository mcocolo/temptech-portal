import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*, clientes(*)')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  async function signInWithGoogle() {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  async function signUp(email, password, fullName) {
    return await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Superadmin se marca con la bandera es_superadmin (o el rol legacy 'superadmin').
  // El rol en la DB queda como 'admin' para que TODAS las políticas RLS (que chequean role='admin') lo habiliten.
  const isSuperadmin  = profile?.es_superadmin === true || profile?.role === 'superadmin'
  const isAdmin       = profile?.role === 'admin' || isSuperadmin   // superadmin es superconjunto de admin
  const isAdmin2      = profile?.role === 'admin2'
  const isVendedor    = profile?.role === 'vendedor'
  const isChofer      = profile?.role === 'chofer'
  const isProceso     = profile?.role === 'proceso'
  const isMantenimiento = profile?.role === 'mantenimiento'
  const isClient      = profile?.user_type === 'client'      || profile?.clientes?.user_type === 'client'
  const isDistributor = profile?.user_type === 'distributor'  || profile?.clientes?.user_type === 'distributor'
  const isTechService = profile?.user_type === 'tecnico' || profile?.clientes?.user_type === 'tecnico'
  const clientCode    = profile?.clientes?.client_code || profile?.client_code

  // Aprobación: solo aplica a distribuidores y técnicos (nunca a roles internos)
  const esRolInterno = isAdmin || isAdmin2 || isVendedor || isChofer || isProceso || isMantenimiento || isSuperadmin
  const necesitaAprobacion = !esRolInterno && (isDistributor || isTechService)
  const aprobacionPendiente = necesitaAprobacion && profile?.aprobado === null
  const aprobacionRechazada = necesitaAprobacion && profile?.aprobado === false
  const isAprobado = !necesitaAprobacion || profile?.aprobado === true

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      isSuperadmin, isAdmin, isAdmin2, isVendedor, isChofer, isProceso, isMantenimiento, isClient, isDistributor, isTechService,
      isAprobado, aprobacionPendiente, aprobacionRechazada,
      clientCode,
      signIn, signInWithGoogle, signUp, signOut,
      refreshProfile: () => user && fetchProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
