/**
 * gymService.js
 * All Supabase queries related to the `gyms` table.
 * RLS ensures every query is automatically scoped to auth.uid().
 */
import { supabase } from '../lib/supabaseClient'

function addMonths(dateString, months) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  date.setMonth(date.getMonth() + Number(months || 0))
  return date.toISOString()
}

function enrichBillingState(gym, latestSubscription) {
  if (!gym) return gym

  // If gym has never been activated (no payment ever made), it's 'pending'
  const isPending = gym.status === 'pending'

  // Prefer the explicit period end date stored by the edge function,
  // fall back to the old created_at + duration_months calculation
  const expiresAt = latestSubscription?.current_period_end
    ? latestSubscription.current_period_end
    : (latestSubscription?.created_at && latestSubscription?.duration_months
        ? addMonths(latestSubscription.created_at, latestSubscription.duration_months)
        : null)

  const daysLeft = expiresAt
    ? Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  // It is expired if it's explicitly expired in status OR the period end date has passed
  const isExpired = (latestSubscription?.status === 'expired') || (daysLeft !== null && daysLeft < 0)

  // Billing status priority: pending (never paid) > expired > active
  let billingStatus
  if (isPending && !latestSubscription) {
    billingStatus = 'pending'
  } else if (isExpired || (!latestSubscription && gym.status === 'active')) {
    billingStatus = 'expired'
  } else {
    billingStatus = 'active'
  }

  return {
    ...gym,
    latest_saas_subscription: latestSubscription || null,
    subscription_expires_at: expiresAt,
    billing_days_left: daysLeft,
    billing_status: billingStatus,
  }
}

/**
 * Fetch the gym belonging to the currently authenticated user.
 * Returns null if none exists yet.
 */
export async function getMyGym(userId) {
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('gyms')
    .select('*, saas_plans(*)')
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('DEBUG: getMyGym error:', error)
    throw error
  }

  if (!data) return null

  const { data: latestSubscription, error: subscriptionError } = await supabase
    .from('saas_subscriptions')
    .select('*')
    .eq('gym_id', data.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (subscriptionError) {
    console.warn('Latest SaaS subscription details unavailable:', subscriptionError.message)
  }

  return enrichBillingState(data, latestSubscription)
}

/**
 * Create a gym for the current user.
 * The DB trigger handles this on signup, but this is the manual fallback
 * for edge cases (e.g. trigger race condition, email-unconfirmed users).
 */
export async function createMyGym(gymName, userId) {
  if (!userId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('gyms')
    .insert({ gym_name: gymName, owner_user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update the authenticated user's gym name.
 */
export async function updateGymName(newName) {
  const { data, error } = await supabase
    .from('gyms')
    .update({ gym_name: newName })
    .eq('owner_user_id', (await supabase.auth.getUser()).data.user?.id)
    .select()
    .single()

  if (error) throw error
  return data
}
