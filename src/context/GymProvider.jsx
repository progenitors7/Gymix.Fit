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

    setGymLoading(true)
    setGymError(null)

    // Safety timeout: if fetch hangs beyond 8s, release loader with an error
    let completed = false
    const timer = setTimeout(() => {
      if (!completed) {
        console.warn('[GymContext] fetchGym timed out after 8 seconds!')
        completed = true
        setGymError('Loading timed out. Please check your connection and try again.')
        setGymLoading(false)
      }
    }, 8000)

    try {
      console.log('[GymContext] Fetching gym for user:', targetUser.id)
      let gymData
      try {
        gymData = await getMyGym(targetUser.id)
      } catch (err) {
        if (err.status === 401 || err.code === 'PGRST301') {
          console.warn('[GymContext] Stale session (401/PGRST301). Refreshing token...')
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && session) {
            console.log('[GymContext] Token refreshed. Retrying fetch...')
            gymData = await getMyGym(targetUser.id)
          } else {
            throw err
          }
        } else {
          throw err
        }
      }

      if (!gymData) {
        console.log('[GymContext] No gym found, creating fallback for:', targetUser.email)
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
        setGymLoading(false)
      }
    } catch (err) {
      console.error('[GymContext] Error fetching gym:', err.message || err)
      if (!completed) {
        clearTimeout(timer)
        completed = true
        setGymError(err.message || 'Error loading gym data.')
        setGym(null)
        setGymLoading(false)
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
    return updated
  }, [])

  const value = {
    gym,
    gymLoading,
    gymError,
    refreshGym,
    updateGymName
  }

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>
}
