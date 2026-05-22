import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { GymContext } from './GymContext'
import { getMyGym, createMyGym, updateGymName as updateGymNameService } from '../services/gymService'

export function GymProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
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

    try {
      console.log('[GymContext] Fetching gym for user:', targetUser.id)
      let gymData
      try {
        gymData = await getMyGym(targetUser.id)
      } catch (err) {
        if (err.status === 401 || err.code === 'PGRST301') {
          console.warn('[GymContext] Stale session or unauthorized (401/PGRST301). Attempting to refresh token...')
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && session) {
            console.log('[GymContext] Token refreshed successfully. Retrying fetch...')
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
        try {
          gymData = await createMyGym(`${emailPrefix}'s Gym`, targetUser.id)
        } catch (insertErr) {
          if (insertErr.code === '23505') {
            gymData = await getMyGym(targetUser.id)
          } else {
            throw insertErr
          }
        }
      }

      setGym(gymData)
    } catch (err) {
      console.error('[GymContext] Error fetching gym:', err.message || err)
      setGymError(err.message || 'Error loading gym data.')
      setGym(null)
    } finally {
      setGymLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    fetchGym(user)
  }, [user, authLoading, fetchGym])

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
