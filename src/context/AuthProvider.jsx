import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        setLoading(false)
      }
    }, 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    }).catch(() => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data?.user) setUser(data.user)
    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data?.user) setUser(data.user)
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }

  const resetPasswordForEmail = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    })
    if (error) throw error
  }

  const value = { user, loading, signUp, signIn, signOut, resetPasswordForEmail, updatePassword, signInWithGoogle }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
