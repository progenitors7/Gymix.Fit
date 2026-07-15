import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './AuthContext'
import { isNativeCapacitorApp } from '../utils/platform'
import { WA_BACKEND_URL } from '../lib/waFetch'

/**
 * Deduplication cache: prevents parallel syncProfile calls for the same user
 * (e.g. getSession + onAuthStateChange firing simultaneously on mount).
 */
const syncPromiseCache = new Map()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // NOTE (BUG #6 FIX): URL role capture was previously in the component body (ran
  // on every render). It is now inside checkHashParamsAndInit() which runs only once
  // on mount, preventing stale localStorage writes on re-renders.

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
        const targetRole = savedRole || currUser.user_metadata?.role || 'member'

        if (!p) {
          const { data, error } = await supabase
            .from('profiles')
            .upsert({
              id: currUser.id,
              full_name: currUser.user_metadata?.full_name || currUser.user_metadata?.name || 'New Member',
              email: currUser.email,
              role: targetRole
            })
            .select()
            .maybeSingle()
          
          if (error) {
            console.error('[AuthProvider] Profile upsert failed:', error)
            p = buildFallbackProfile(currUser)
            p.role = targetRole // Ensure fallback matches target role
          } else {
            p = data || buildFallbackProfile(currUser)
          }
        } else {
          // Profile exists in the database.
          // We only upgrade the profile role from 'member' to 'owner' if:
          // 1. The database profile currently has a 'member' role.
          // 2. The intended role (requested via signup role parameter or metadata) is 'owner'.
          // We NEVER downgrade an existing 'owner' to 'member'.
          if (p.role === 'member' && targetRole === 'owner') {
            console.log(`[AuthProvider] Role mismatch detected. Upgrading profile role from 'member' to 'owner'`)
            const { data: updatedData, error: updateError } = await supabase
              .from('profiles')
              .update({ role: 'owner' })
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
        if (typeof window !== 'undefined' && window.location && window.history) {
          const url = new URL(window.location.href)
          if (url.searchParams.has('role')) {
            url.searchParams.delete('role')
            window.history.replaceState({}, '', url.pathname + url.search)
          }
        }
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

    const checkHashParamsAndInit = async () => {
      // 1. Check if hash params exist on web window (browser auto-login token pass)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        
        if (accessToken && refreshToken) {
          console.log('[AuthProvider] Found session tokens in URL hash. Restoring session...')
          try {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            // Clean up the hash from the URL bar
            window.history.replaceState(null, '', window.location.pathname)
          } catch (e) {
            console.error('[AuthProvider] Failed to set session from hash:', e)
          }
        }
      }

      // BUG #6 FIX: Capture ?role= from URL here (on mount only, not on every render)
      if (typeof window !== 'undefined' && window.location.search) {
        const searchParams = new URLSearchParams(window.location.search)
        const urlRole = searchParams.get('role')
        if (urlRole) {
          localStorage.setItem('oauth_signup_role', urlRole)
        }
      }

      // 2. Load the session
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!settled) {
          settled = true
          clearTimeout(timer)
          const currUser = session?.user ?? null
          setUser(currUser)
          if (currUser) {
            // If we have a cached profile, we can load instantly. Otherwise, wait for sync.
            const cacheKey = `profile_cache_${currUser.id}`
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
              try {
                const parsed = JSON.parse(cached)
                if (parsed) {
                  setProfile(parsed)
                  setLoading(false)
                  // Sync in background
                  syncProfile(currUser).catch(err => {
                    console.error('[AuthProvider] Background profile sync failed:', err)
                  })
                  return
                }
              } catch (e) {
                console.error('[AuthProvider] Error parsing cached profile:', e)
              }
            }

            // No cache: wait for initial profile sync
            try {
              await syncProfile(currUser)
            } catch (err) {
              console.error('[AuthProvider] Initial profile sync failed:', err)
            } finally {
              setLoading(false)
            }
          } else {
            setLoading(false)
          }
        }
      } catch (err) {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          setLoading(false)
        }
      }
    }

    checkHashParamsAndInit()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currUser = session?.user ?? null
      setUser(currUser)
      if (currUser) {
        // Use cached profile instantly if available
        const cacheKey = `profile_cache_${currUser.id}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (parsed) {
              setProfile(parsed)
              // Sync in background
              syncProfile(currUser).catch(err => {
                console.error('[AuthProvider] Background profile sync failed:', err)
              })
              return
            }
          } catch (e) {
            console.error('[AuthProvider] Error parsing cached profile:', e)
          }
        }
        // No cache: sync in background
        syncProfile(currUser).catch(err => {
          console.error('[AuthProvider] Background profile sync failed:', err)
        })
      } else {
        setProfile(null)
      }
    })

      // Listen for native deep link events (com.gymix.fit://) to capture Supabase OAuth tokens
      if (isNativeCapacitorApp()) {
        import('@capacitor/app').then(({ App }) => {
          App.addListener('appUrlOpen', async (event) => {
            console.log('[Capacitor Auth] App opened with URL:', event.url);
            try {
              const urlStr = event.url;
              const hashIndex = urlStr.indexOf('#');
              if (hashIndex !== -1) {
                const hash = urlStr.substring(hashIndex + 1);
                const params = new URLSearchParams(hash);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                  setLoading(true);
                  // Parse and save role to localStorage for Capacitor deep links
                  const match = urlStr.match(/[?&]role=([^&#]+)/)
                  if (match) {
                    localStorage.setItem('oauth_signup_role', match[1])
                  }

                  const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                  });
                  if (error) throw error;
                  console.log('[Capacitor Auth] Session set successfully!', data);
                }
              }
            } catch (err) {
              console.error('[Capacitor Auth] Failed to handle deep link login:', err.message || err);
            } finally {
              setLoading(false);
            }
          });
        });
      }

      return () => {
        clearTimeout(timer)
        subscription.unsubscribe()
      }
    }, [])

  const signUp = async (email, password, role = 'member', fullName = '', gymName = '') => {
    try {
      const res = await fetch(`${WA_BACKEND_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, fullName, gymName })
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Signup failed via backend gateway');
      }

      // If backend returns a valid session, set it locally
      if (result?.session) {
        const { data, error } = await supabase.auth.setSession(result.session);
        if (error) throw error;
        if (data?.user) {
          setUser(data.user);
          await syncProfile(data.user);
        }
        return data;
      }
      return result;
    } catch (err) {
      // Robust fallback to direct Supabase Auth in case backend is down or returned rate limit / other errors that we want to bypass/fallback for network failure
      const isNetworkError = err.message.includes('Failed to fetch') || err.message.includes('NetworkError');
      if (isNetworkError || err.message.includes('Signup failed via backend gateway')) {
        console.warn('[AuthFallback] Backend signup failed/unreachable. Falling back to direct Supabase Auth.', err);
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
        });
        if (error) throw error;
        if (data?.session && data?.user) {
          setUser(data.user);
          await syncProfile(data.user);
        } else {
          setUser(null);
          setProfile(null);
        }
        return data;
      }
      throw err;
    }
  }

  const signIn = async (email, password) => {
    try {
      const res = await fetch(`${WA_BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Login failed via backend gateway');
      }

      // Set the session received from the backend
      const { data, error } = await supabase.auth.setSession(result.session);
      if (error) throw error;

      if (data?.user) {
        setUser(data.user);
        await syncProfile(data.user);
      }
      return data;
    } catch (err) {
      // Robust fallback to direct Supabase Auth in case of network errors
      const isNetworkError = err.message.includes('Failed to fetch') || err.message.includes('NetworkError');
      if (isNetworkError || err.message.includes('Login failed via backend gateway')) {
        console.warn('[AuthFallback] Backend login failed/unreachable. Falling back to direct Supabase Auth.', err);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.user) {
          setUser(data.user);
          await syncProfile(data.user);
        }
        return data;
      }
      throw err;
    }
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
    const redirectTo = `${window.location.origin}/reset-password`;
    try {
      const res = await fetch(`${WA_BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo })
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Password reset request failed via backend gateway');
      }
      return result;
    } catch (err) {
      const isNetworkError = err.message.includes('Failed to fetch') || err.message.includes('NetworkError');
      if (isNetworkError || err.message.includes('Password reset request failed via backend gateway')) {
        console.warn('[AuthFallback] Backend password reset failed/unreachable. Falling back to direct Supabase Auth.', err);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (error) throw error;
        return { success: true };
      }
      throw err;
    }
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

    const isNative = isNativeCapacitorApp();
    let redirectUrl = isNative ? 'com.gymix.fit://' : `${window.location.origin}`;
    if (role) {
      redirectUrl += `?role=${role}`;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
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
      // BUG #16 FIX: Also update the localStorage cache so reloads show fresh data
      if (p) {
        localStorage.setItem(`profile_cache_${user.id}`, JSON.stringify(p))
      }
      return p
    }
    return null
  }

  const value = { user, profile, loading, signUp, signIn, signOut, resetPasswordForEmail, updatePassword, signInWithGoogle, refreshProfile }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
