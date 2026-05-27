import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './AuthContext'

/**
 * Deduplication cache: prevents parallel syncProfile calls for the same user
 * (e.g. getSession + onAuthStateChange firing simultaneously on mount).
 */
const syncPromiseCache = new Map()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (uid) => {
    if (!uid) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }
    return data
  }

  const buildFallbackProfile = (currUser) => {
    const cached = localStorage.getItem(`profile_cache_${currUser.id}`)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed) return parsed
      } catch (e) {
        console.error('[AuthProvider] Error parsing cached profile:', e)
      }
    }
    const savedRole = localStorage.getItem('oauth_signup_role') || currUser.user_metadata?.role || 'member'
    return {
      id: currUser.id,
      full_name: currUser.user_metadata?.full_name || currUser.user_metadata?.name || 'New Member',
      email: currUser.email,
      role: savedRole
    }
  }

  const syncProfile = async (currUser) => {
    if (!currUser) {
      setProfile(null)
      return null
    }

    // Deduplicate: if a sync for this user is already in-flight, reuse it
    if (syncPromiseCache.has(currUser.id)) {
      return syncPromiseCache.get(currUser.id)
    }

    const promise = (async () => {
      try {
        let p = await fetchProfile(currUser.id)
        const savedRole = localStorage.getItem('oauth_signup_role')

        if (!p) {
          const finalRole = savedRole || currUser.user_metadata?.role || 'member'
          const { data, error } = await supabase
            .from('profiles')
            .upsert({
              id: currUser.id,
              full_name: currUser.user_metadata?.full_name || currUser.user_metadata?.name || 'New Member',
              email: currUser.email,
              role: finalRole
            })
            .select()
            .maybeSingle()
          
          if (error) {
            console.error('[AuthProvider] Profile upsert failed:', error)
            p = buildFallbackProfile(currUser)
          } else {
            p = data || buildFallbackProfile(currUser)
          }
        } else {
          // Profile exists in the database.
          // If a specific role was requested via Google Signup and it differs from the database (which defaults to 'member'),
          // we update the database record to match the explicitly requested signup role.
          if (savedRole && p.role !== savedRole) {
            const { data: updatedData, error: updateError } = await supabase
              .from('profiles')
              .update({ role: savedRole })
              .eq('id', currUser.id)
              .select()
              .maybeSingle()
            
            if (updateError) {
              console.error('[AuthProvider] Sync profile role update failed:', updateError)
            } else if (updatedData) {
              p = updatedData
            }
          }
        }
        
        // Cache the profile in local storage for instant loading next time
        localStorage.setItem(`profile_cache_${currUser.id}`, JSON.stringify(p))
        
        // Clear cached role once profile resolution has settled
        localStorage.removeItem('oauth_signup_role')
        setProfile(p)
        return p
      } catch (err) {
        console.error('[AuthProvider] Error in syncProfile:', err)
        const fallback = buildFallbackProfile(currUser)
        setProfile(fallback)
        return fallback
      } finally {
        syncPromiseCache.delete(currUser.id)
      }
    })()

    syncPromiseCache.set(currUser.id, promise)
    return promise
  }

  useEffect(() => {
    let settled = false

    // Hard fallback: if everything hangs for 5s, stop loading anyway
    const timer = setTimeout(() => {
      if (!settled) {
        console.warn('[AuthProvider] Session resolution timed out after 5s. Releasing loader.')
        settled = true
        setLoading(false)
      }
    }, 5000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        const currUser = session?.user ?? null
        setUser(currUser)
        if (currUser) {
          // OPTIMIZATION: Instantly set initial profile from user metadata to prevent loading screens
          const fallback = buildFallbackProfile(currUser)
          setProfile(fallback)
          setLoading(false)
          
          // Sync profile in background without blocking mount
          syncProfile(currUser).catch(err => {
            console.error('[AuthProvider] Background profile sync failed:', err)
          })
        } else {
          setLoading(false)
        }
      }
    }).catch(() => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currUser = session?.user ?? null
      setUser(currUser)
      if (currUser) {
        // OPTIMIZATION: Set instant profile, then sync in background
        const fallback = buildFallbackProfile(currUser)
        setProfile(fallback)
        syncProfile(currUser).catch(err => {
          console.error('[AuthProvider] Background profile sync failed:', err)
        })
      } else {
        setProfile(null)
      }
    })

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, role = 'member', fullName = '', gymName = '') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fullName,
          gym_name: gymName
        }
      }
    })
    if (error) throw error
    
    // Only establish a local session if the server actually returned one (meaning email confirmation is off)
    if (data?.session && data?.user) {
      setUser(data.user)
      await syncProfile(data.user)
    } else {
      // If email confirmation is required, keep user logged out locally.
      // This allows them to see the verification alert on the signup page instead of being routed to a locked dashboard.
      setUser(null)
      setProfile(null)
    }
    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data?.user) {
      setUser(data.user)
      await syncProfile(data.user)
    }
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
    
    // OPTIMIZATION: Clear all cached gym and profile state on signout
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('gym_cache_') || key.startsWith('profile_cache_')) {
        localStorage.removeItem(key)
      }
    })
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

  const signInWithGoogle = async (role = null) => {
    if (role) {
      localStorage.setItem('oauth_signup_role', role)
    } else {
      localStorage.removeItem('oauth_signup_role')
    }
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

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id)
      setProfile(p)
      return p
    }
    return null
  }

  const value = { user, profile, loading, signUp, signIn, signOut, resetPasswordForEmail, updatePassword, signInWithGoogle, refreshProfile }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

