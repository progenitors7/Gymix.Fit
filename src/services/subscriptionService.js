import { supabase } from '../lib/supabaseClient';

// Helper to format dates for DB
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

const AUTO_DURATION_TYPES = new Set(['monthly', 'quarterly', 'yearly']);

export const subscriptionService = {
  // Get all subscriptions for a specific gym (protects against Super Admin leakage in dashboard)
  async getAllSubscriptions(gymId) {
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        members (
          id,
          full_name,
          phone_number,
          join_date
        )
      `);

    if (gymId) {
      query = query.eq('gym_id', gymId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get all subscriptions for a specific member (full plan history)
  async getSubscriptionsByMember(memberId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', memberId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get active subscriptions count
  async getActiveSubscriptionsCount(gymId) {
    let query = supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (gymId) {
      query = query.eq('gym_id', gymId);
    }

    const { count, error } = await query;

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
