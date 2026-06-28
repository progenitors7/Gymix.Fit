import { supabase } from '../lib/supabaseClient';

// Helper to format dates for DB
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

const AUTO_DURATION_TYPES = new Set(['monthly', 'quarterly', 'yearly']);

export const getStatusFromExpiry = (expiryDate) => {
  if (!expiryDate) return 'active';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 7) return 'expiring_soon';
  return 'active';
};

export const subscriptionService = {
  // Get all subscriptions for a specific gym (protects against Super Admin leakage in dashboard)
  async getAllSubscriptions(gymId) {
    if (!gymId) throw new Error('Gym ID is required to fetch subscriptions');

    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        members (
          id,
          full_name,
          phone_number,
          join_date
        )
      `)
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(sub => ({
      ...sub,
      status: getStatusFromExpiry(sub.expiry_date)
    }));
  },

  // Get all subscriptions for a specific member (full plan history)
  async getSubscriptionsByMember(memberId, gymId = null) {
    let query = supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', memberId);

    if (gymId) {
      query = query.eq('gym_id', gymId);
    }

    const { data, error } = await query
      .order('start_date', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(sub => ({
      ...sub,
      status: getStatusFromExpiry(sub.expiry_date)
    }));
  },

  // Get active subscriptions count
  async getActiveSubscriptionsCount(gymId) {
    if (!gymId) throw new Error('Gym ID is required to get active subscriptions count');

    const { count, error } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('gym_id', gymId);

    if (error) throw error;
    return count;
  },

  // Calculate Expiry Date based on Start Date and Duration
  calculateExpiryDate(startDate, durationType) {
    const date = new Date(startDate);
    switch (durationType) {
      case 'monthly':
        date.setDate(date.getDate() + 30);
        break;
      case 'quarterly':
        date.setDate(date.getDate() + 90);
        break;
      case 'yearly':
        date.setDate(date.getDate() + 365);
        break;
      // 'custom' handles its own date logic in the form
      default:
        break;
    }
    return formatDate(date);
  },

  // Create a new subscription
  async createSubscription(gymId, subscriptionData) {
    // Determine expiry date if not custom
    let expiry_date = subscriptionData.expiry_date;
    if (AUTO_DURATION_TYPES.has(subscriptionData.duration_type)) {
        expiry_date = this.calculateExpiryDate(subscriptionData.start_date, subscriptionData.duration_type);
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([
        { 
          gym_id: gymId,
          member_id: subscriptionData.member_id,
          plan_name: subscriptionData.plan_name,
          duration_type: subscriptionData.duration_type,
          amount: subscriptionData.amount,
          start_date: subscriptionData.start_date,
          expiry_date: expiry_date
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a subscription
  async updateSubscription(id, subscriptionData) {
     let updatePayload = { ...subscriptionData };

     if (updatePayload.duration_type && updatePayload.start_date && AUTO_DURATION_TYPES.has(updatePayload.duration_type)) {
        updatePayload.expiry_date = this.calculateExpiryDate(updatePayload.start_date, updatePayload.duration_type);
     }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a subscription
  async deleteSubscription(id) {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};
