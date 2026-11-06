import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Custom hook to listen to Supabase Postgres Realtime changes for a specific gym.
 * 
 * @param {Object} options
 * @param {string} options.gymId - Gym UUID to filter events for
 * @param {Array<string>} [options.tables] - List of tables to listen to (default: ['connection_requests', 'attendance', 'payments', 'members'])
 * @param {Function} options.onUpdate - Callback invoked when a matching real-time event occurs
 * @param {number} [options.debounceMs=350] - Debounce delay to prevent rapid-fire re-fetches
 */
export function useRealtimeSync({
  gymId,
  tables = ['connection_requests', 'attendance', 'payments', 'members'],
  onUpdate,
  debounceMs = 350
}) {
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  const debounceTimerRef = useRef(null)
  const tablesKey = JSON.stringify(tables || [])

  useEffect(() => {
    const subscribedTables = JSON.parse(tablesKey)
    if (!gymId || subscribedTables.length === 0) return

    const triggerUpdate = (payload) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        if (onUpdateRef.current) {
          onUpdateRef.current(payload)
        }
      }, debounceMs)
    }

    const channelName = `gymix-realtime-${gymId}-${subscribedTables.join('-')}`
    let channel = supabase.channel(channelName)

    subscribedTables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `gym_id=eq.${gymId}`
        },
        (payload) => {
          console.log(`[Gymix Realtime] Live event on "${table}":`, payload.eventType)
          triggerUpdate({ table, ...payload })
        }
      )
    })

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Gymix Realtime] Channel connected successfully for tables: [${subscribedTables.join(', ')}]`)
      } else if (status === 'CHANNEL_ERROR') {
        console.warn(`[Gymix Realtime] Channel error on [${subscribedTables.join(', ')}]:`, err)
      }
    })

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [gymId, tablesKey, debounceMs])
}
