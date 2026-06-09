/**
 * useMembers.js
 * Hook that manages member list state — fetch, optimistic updates, search.
 */
import { useState, useEffect, useCallback } from 'react'
import { getMembers, createMember, updateMember, deleteMember, filterMembers } from '../services/memberService'
import { useCurrentGym } from './useCurrentGym'
import { unifiedService } from '../services/unifiedService'
import { DEFAULT_WELCOME_TEMPLATE } from '../config/whatsappTemplates'

export function useMembers() {
  const { gym, gymId, isReady } = useCurrentGym()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasFetched, setHasFetched] = useState(false)

  const fetchMembers = useCallback(async () => {
    if (!isReady) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getMembers(gymId)
      setMembers(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setHasFetched(true)
    }
  }, [isReady, gymId])

  useEffect(() => {
    let mounted = true;
    if (isReady && !hasFetched) {
      setTimeout(() => {
        if (mounted) fetchMembers()
      }, 0);
    }
    return () => {
      mounted = false;
    };
  }, [fetchMembers, isReady, hasFetched])

  const addMember = useCallback(async (formData) => {
    if (!gymId) throw new Error('Gym not loaded')
    const { recordPayment, amountPaid, ...memberData } = formData
    const payload = { ...memberData, gym_id: gymId }
    const newMember = await createMember(payload)
    
    if (newMember && gym) {
      if (recordPayment && amountPaid > 0) {
        await unifiedService.smartRenew(
          gym.id,
          newMember.id,
          {
            plan_name: newMember.membership_plan,
            duration_type: 'custom',
            amount: parseFloat(amountPaid),
            expiry_date: newMember.expiry_date,
            gym_id: gym.id
          },
          {
            amount_paid: parseFloat(amountPaid),
            payment_method: 'cash',
            payment_status: 'paid',
            notes: 'Initial registration payment'
          }
        );
      } else {
        await unifiedService.recordInitialMemberSetup(gym.id, newMember);
      }

      // Trigger WhatsApp welcome message if autopilot is enabled and connected
      if (newMember.phone_number) {
        try {
          const saved = localStorage.getItem(`gym_settings_${gymId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.waAutopilotEnabled && parsed.waConnected) {
              const welcomeTemplate = parsed.waTemplateWelcome || DEFAULT_WELCOME_TEMPLATE;
              const expiry = newMember.expiry_date ? new Date(newMember.expiry_date).toLocaleDateString() : 'soon';
              const text = welcomeTemplate
                .replace(/{{name}}/g, newMember.full_name)
                .replace(/{{gymName}}/g, gym?.gym_name || 'Gym')
                .replace(/{{plan}}/g, newMember.membership_plan || 'Plan')
                .replace(/{{date}}/g, expiry);

              const WA_BACKEND_URL = import.meta.env.VITE_WA_BACKEND_URL || 'http://localhost:5000';
              fetch(`${WA_BACKEND_URL}/api/whatsapp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  gymId: gym.id,
                  phone: newMember.phone_number,
                  message: text
                })
              }).then(res => {
                if (res.ok) {
                  console.log('[Gymix WA] Welcome message sent to', newMember.full_name);
                } else {
                  console.warn('[Gymix WA] Failed to send welcome message');
                }
              }).catch(err => {
                console.warn('[Gymix WA] Error sending welcome message:', err);
              });
            }
          }
        } catch (e) {
          console.error('[Gymix WA] Welcome message trigger error:', e);
        }
      }
    }

    setMembers((prev) => [newMember, ...prev])
    return newMember
  }, [gymId, gym])

  const editMember = useCallback(async (id, formData) => {
    const updated = await updateMember(id, formData)
    setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)))
    return updated
  }, [])

  const removeMember = useCallback(async (id) => {
    await deleteMember(id)
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const filtered = filterMembers(members, searchQuery)

  return {
    members,
    filteredMembers: filtered,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    fetchMembers,
    addMember,
    editMember,
    removeMember,
  }
}
