/**
 * memberService.js
 * All Supabase queries for the `members` table.
 * RLS + my_gym_id() ensures every query is scoped to the authenticated owner's gym.
 */
import { supabase } from '../lib/supabaseClient'

const MEMBER_FIELDS = `
  id, gym_id, profile_id, avatar_url, full_name, phone_number, gender,
  join_date, membership_plan, expiry_date, status, notes, biometric_user_id, left_at, created_at
`

const MEMBER_WITH_SUBSCRIPTIONS = `
  ${MEMBER_FIELDS},
  subscriptions (
    id,
    plan_name,
    expiry_date,
    status,
    start_date,
    created_at
  )
`

const getStatusFromExpiry = (expiryDate) => {
  if (!expiryDate) return 'active'

  const today = new Date(new Date().toISOString().split('T')[0])
  const expiry = new Date(expiryDate)
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 7) return 'expiring_soon'
  return 'active'
}

const getLatestSubscription = (subscriptions = []) => {
  return subscriptions
    .filter((sub) => sub.expiry_date)
    .sort((a, b) => new Date(b.expiry_date) - new Date(a.expiry_date))[0]
}

const syncMemberFromLatestSubscription = (member) => {
  if (!member) return null

  if (!member.subscriptions || member.subscriptions.length === 0) {
    if (member.status === 'left') {
      const { subscriptions, ...cleanMember } = member
      return cleanMember
    }
    const { subscriptions, ...cleanMember } = member
    return {
      ...cleanMember,
      status: getStatusFromExpiry(cleanMember.expiry_date)
    }
  }

  if (member.status === 'left') {
    const { subscriptions, ...cleanMember } = member
    return cleanMember
  }

  const latest = getLatestSubscription(member.subscriptions)
  if (!latest) {
    const { subscriptions, ...cleanMember } = member
    return cleanMember
  }

  const { subscriptions, ...cleanMember } = member
  return {
    ...cleanMember,
    membership_plan: latest.plan_name || cleanMember.membership_plan,
    expiry_date: latest.expiry_date || cleanMember.expiry_date,
    status: getStatusFromExpiry(latest.expiry_date || cleanMember.expiry_date),
  }
}

/**
 * Fetch all members for the current user's gym.
 * @returns {Promise<Array>}
 */
export async function getMembers(gymId) {
  if (!gymId) throw new Error('Gym ID is required to fetch members')

  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_FIELDS)
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const allMembers = (data ?? []).map(syncMemberFromLatestSubscription)

  // 30-day auto-purge: permanently delete "left" members whose left_at > 30 days ago
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const expiredLeftMembers = allMembers.filter(m => {
    if (m.status !== 'left' || !m.left_at) return false
    const leftTime = new Date(m.left_at).getTime()
    return (now - leftTime) > THIRTY_DAYS_MS
  })

  if (expiredLeftMembers.length > 0) {
    // Fire-and-forget background batch purge in a single network request
    const idsToPurge = expiredLeftMembers.map(m => m.id)
    deleteMembersBatch(idsToPurge).catch(err => {
      console.error('[Gymix] Auto-purge failed for expired left members:', err)
    })
    console.log(`[Gymix] Auto-purging ${expiredLeftMembers.length} left member(s) older than 30 days`)
  }

  // Return all members except the ones being purged
  const purgeIds = new Set(expiredLeftMembers.map(m => m.id))
  return allMembers.filter(m => !purgeIds.has(m.id))
}

/**
 * Fetch a single member by id.
 */
export async function getMemberById(id) {
  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_WITH_SUBSCRIPTIONS)
    .eq('id', id)
    .single()

  if (error) throw error
  return syncMemberFromLatestSubscription(data)
}

/**
 * Create a new member.
 * gym_id is passed explicitly (from GymContext) — RLS double-checks it.
 */
export async function createMember(payload) {
  const { data, error } = await supabase
    .from('members')
    .insert(payload)
    .select(MEMBER_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing member by id.
 */
export async function updateMember(id, payload) {
  const { data, error } = await supabase
    .from('members')
    .update(payload)
    .eq('id', id)
    .select(MEMBER_WITH_SUBSCRIPTIONS)
    .single()

  if (error) throw error

  // If a profile is linked, sync name, phone, gender, and avatar to the profiles table
  if (data && data.profile_id) {
    const profileUpdates = {}
    if (payload.full_name) profileUpdates.full_name = payload.full_name
    if (payload.phone_number !== undefined) profileUpdates.phone_number = payload.phone_number
    if (payload.gender !== undefined) profileUpdates.gender = payload.gender
    if (payload.avatar_url !== undefined) profileUpdates.avatar_url = payload.avatar_url
    
    if (Object.keys(profileUpdates).length > 0) {
      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', data.profile_id)
    }
  }

  return syncMemberFromLatestSubscription(data)
}

/**
 * Delete a member by id.
 */
export async function deleteMember(id) {
  // Cascading deletes are configured on the database level, so all dependent
  // child records (payments, subscriptions, attendance, transactions, etc.) 
  // will be deleted automatically in a single fast transaction.
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Bulk delete members by their IDs.
 * Utilizes database cascading deletes for maximum efficiency in 1 query.
 */
export async function deleteMembersBatch(ids) {
  if (!ids || ids.length === 0) return
  const { error } = await supabase
    .from('members')
    .delete()
    .in('id', ids)

  if (error) throw error
}

/**
 * Search members by name or phone (client-side filter for instant UX).
 * All results are already RLS-scoped, so this is safe.
 */
export function filterMembers(members, query) {
  if (!query?.trim()) return members
  const q = query.toLowerCase()
  return members.filter(
    (m) =>
      m.full_name?.toLowerCase().includes(q) ||
      m.phone_number?.toLowerCase().includes(q)
  )
}
