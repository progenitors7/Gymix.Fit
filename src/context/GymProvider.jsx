import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { GymContext } from './GymContext'
import { getMyGym, createMyGym, updateGymName as updateGymNameService } from '../services/gymService'

export function GymProvider({ children }) {
  const { user, profile, loading: authLoading } = useAuth()
  const [gym, setGym] = useState(null)
  const [gymLoading, setGymLoading] = useState(true)
  const [gymError, setGymError] = useState(null)

  const fetchGym = useCallback(async (targetUser) => {
    if (!targetUser) {
      setGym(null)
      setGymLoading(false)
      return
    }

    // Check if Ghost Mode (SuperAdmin Impersonation) is active
    const ghostGymId = localStorage.getItem('ghost_mode_gym_id') || localStorage.getItem('selected_gym_id');
    if (ghostGymId) {
      try {
        const { data: ghostGym } = await supabase
          .from('gyms')
          .select('*, saas_plans(*)')
          .eq('id', ghostGymId)
          .maybeSingle();

        if (ghostGym) {
          const { data: latestSub } = await supabase
            .from('saas_subscriptions')
            .select('*')
            .eq('gym_id', ghostGym.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          setGym({
            ...ghostGym,
            latest_saas_subscription: latestSub || null,
            subscription_expires_at: latestSub?.current_period_end || null,
            billing_days_left: latestSub?.current_period_end ? Math.ceil((new Date(latestSub.current_period_end) - new Date()) / (1000*60*60*24)) : 30,
            billing_status: 'active',
            is_ghost_mode: true
          });
          setGymLoading(false);
          return;
        }
      } catch (ghostErr) {
        console.error('[GymContext] Error loading ghost mode gym:', ghostErr);
      }
    }

    // Try to load from cache first for instant UX
    const cacheKey = `gym_cache_${targetUser.id}`
    const cached = localStorage.getItem(cacheKey)
    let hasCache = false
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed) {
          setGym(parsed)
          setGymLoading(false)
          hasCache = true
        }
      } catch (e) {
        console.error('[GymContext] Error parsing cached gym:', e)
      }
    } else {
      setGymLoading(true)
    }

    setGymError(null)

    // Safety timeout: if fetch hangs beyond 8s, release loader only if we don't have cached data
    let completed = false
    const timer = setTimeout(() => {
      if (!completed) {
        console.warn('[GymContext] fetchGym timed out after 8 seconds!')
        completed = true
        if (!localStorage.getItem(cacheKey)) {
          setGymError('Loading timed out. Please check your connection and try again.')
          setGymLoading(false)
        }
      }
    }, 8000)

    try {
      let gymData
      try {
        gymData = await getMyGym(targetUser.id)
      } catch (err) {
        if (err.status === 401 || err.code === 'PGRST301') {
          console.warn('[GymContext] Stale session (401/PGRST301). Refreshing token...')
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && session) {
            gymData = await getMyGym(targetUser.id)
          } else {
            throw err
          }
        } else {
          throw err
        }
      }

      if (!gymData) {
        const emailPrefix = targetUser.email?.split('@')[0] || 'My'
        const initialGymName = targetUser.user_metadata?.gym_name || `${emailPrefix}'s Gym`
        try {
          gymData = await createMyGym(initialGymName, targetUser.id)
        } catch (insertErr) {
          if (insertErr.code === '23505') {
            // Unique constraint: gym already exists via DB trigger, re-fetch
            gymData = await getMyGym(targetUser.id)
            if (!gymData) {
              throw new Error('Your gym exists but could not be loaded. Please try logging out and back in.')
            }
          } else {
            throw insertErr
          }
        }
      }

      if (!completed) {
        clearTimeout(timer)
        completed = true
        setGym(gymData)
        
        // Save to cache for next instant load
        localStorage.setItem(cacheKey, JSON.stringify(gymData))
        setGymLoading(false)
      }
    } catch (err) {
      console.error('[GymContext] Error fetching gym:', err.message || err)
      if (!completed) {
        clearTimeout(timer)
        completed = true
        // Only trigger layout error if we don't even have cached data to show
        if (!localStorage.getItem(cacheKey)) {
          setGymError(err.message || 'Error loading gym data.')
          setGym(null)
          setGymLoading(false)
        }
      }
    }
  }, [])

  useEffect(() => {
    // Wait until auth is fully resolved (user + profile loaded)
    if (authLoading) return

    if (user && profile && profile.role === 'owner') {
      fetchGym(user)
    } else {
      // Not an owner (member, or no user) — no gym to fetch
      setGym(null)
      setGymLoading(false)
      setGymError(null)
    }
  }, [user, profile, authLoading, fetchGym])

  const refreshGym = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    await fetchGym(currentUser)
  }, [fetchGym])

  const updateGymName = useCallback(async (newName) => {
    const updated = await updateGymNameService(newName)
    setGym(updated)
    if (user?.id) {
      localStorage.setItem(`gym_cache_${user.id}`, JSON.stringify(updated))
    }
    return updated
  }, [user?.id])

  const value = {
    gym,
    gymLoading,
    gymError,
    refreshGym,
    updateGymName
  }

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>
}
