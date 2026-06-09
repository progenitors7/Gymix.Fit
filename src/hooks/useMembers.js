/**
 * useMembers.js
 * Hook that manages member list state — fetch, optimistic updates, search.
 */
import { useState, useEffect, useCallback } from 'react'
import { getMembers, createMember, updateMember, deleteMember, filterMembers } from '../services/memberService'
import { useCurrentGym } from './useCurrentGym'
import { unifiedService } from '../services/unifiedService'
import { DEFAULT_WELCOME_TEMPLATE, DEFAULT_LEFT_TEMPLATE } from '../config/whatsappTemplates'

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
            const WA_BACKEND_URL = import.meta.env.VITE_WA_BACKEND_URL || 'http://localhost:5000';

            // First verify live server connection, then send
            const statusCheck = async () => {
              try {
                const statusRes = await fetch(`${WA_BACKEND_URL}/api/whatsapp/status?gymId=${gym.id}`);
                if (!statusRes.ok) return;
                const statusData = await statusRes.json();

                const isConnected = statusData.status === 'connected';
                const autopilotEnabled = parsed.waAutopilotEnabled !== false; // default to true if not set

                if (autopilotEnabled && isConnected) {
                  // Update localStorage with live connection status
                  const updatedSettings = { ...parsed, waConnected: true };
                  if (statusData.connectedNumber) {
                    updatedSettings.waConnectedNumber = `+${statusData.connectedNumber}`;
                  }
                  localStorage.setItem(`gym_settings_${gymId}`, JSON.stringify(updatedSettings));

                  const welcomeTemplate = parsed.waTemplateWelcome || DEFAULT_WELCOME_TEMPLATE;
                  const expiry = newMember.expiry_date ? new Date(newMember.expiry_date).toLocaleDateString() : 'soon';
                  const text = welcomeTemplate
                    .replace(/{{name}}/g, newMember.full_name)
                    .replace(/{{gymName}}/g, gym?.gym_name || 'Gym')
                    .replace(/{{plan}}/g, newMember.membership_plan || 'Plan')
                    .replace(/{{date}}/g, expiry);

                  const sendRes = await fetch(`${WA_BACKEND_URL}/api/whatsapp/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      gymId: gym.id,
                      phone: newMember.phone_number,
                      message: text
                    })
                  });
                  if (sendRes.ok) {
                    console.log('[Gymix WA] Welcome message sent to', newMember.full_name);
                  } else {
                    console.warn('[Gymix WA] Failed to send welcome message');
                  }
                }
              } catch (err) {
                console.warn('[Gymix WA] Error sending welcome message:', err);
              }
            };

            statusCheck();
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
    const previousMember = members.find(m => m.id === id);
    const wasAlreadyLeft = previousMember?.status === 'left';

    const updated = await updateMember(id, formData)
    setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)))

    // Trigger WhatsApp goodbye message if status changed to 'left' and autopilot is enabled
    if (updated && updated.status === 'left' && !wasAlreadyLeft && updated.phone_number) {
      _sendGoodbyeMessage(updated);
    }

    return updated
  }, [gymId, gym, members])

  // Helper: send goodbye message via WhatsApp
  const _sendGoodbyeMessage = useCallback((member) => {
    try {
      const saved = localStorage.getItem(`gym_settings_${gymId}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const WA_BACKEND_URL = import.meta.env.VITE_WA_BACKEND_URL || 'http://localhost:5000';

      const sendGoodbye = async () => {
        try {
          // Verify live server connection first
          const statusRes = await fetch(`${WA_BACKEND_URL}/api/whatsapp/status?gymId=${gymId}`);
          if (!statusRes.ok) return;
          const statusData = await statusRes.json();

          const isConnected = statusData.status === 'connected';
          const autopilotEnabled = parsed.waAutopilotEnabled !== false;

          if (autopilotEnabled && isConnected) {
            const leftTemplate = parsed.waTemplateLeft || DEFAULT_LEFT_TEMPLATE;
            const text = leftTemplate
              .replace(/{{name}}/g, member.full_name)
              .replace(/{{gymName}}/g, gym?.gym_name || 'Gym')
              .replace(/{{plan}}/g, member.membership_plan || 'Plan')
              .replace(/{{date}}/g, member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'soon');

            const sendRes = await fetch(`${WA_BACKEND_URL}/api/whatsapp/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gymId: gymId,
                phone: member.phone_number,
                message: text
              })
            });
            if (sendRes.ok) {
              console.log('[Gymix WA] Goodbye message sent to', member.full_name);
            } else {
              console.warn('[Gymix WA] Failed to send goodbye message');
            }
          }
        } catch (err) {
          console.warn('[Gymix WA] Error sending goodbye message:', err);
        }
      };

      sendGoodbye();
    } catch (e) {
      console.error('[Gymix WA] Goodbye message trigger error:', e);
    }
  }, [gymId, gym])

  // Hard-delete: gym owner permanently removes a member
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
