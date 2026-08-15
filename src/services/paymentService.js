import { supabase } from '../lib/supabaseClient';
import { pushNotificationService } from './pushNotificationService';

export const paymentService = {
  // Get all payments for a specific gym (protects against Super Admin leakage in dashboard)
  async getAllPayments(gymId, page = null, pageSize = null) {
    if (!gymId) throw new Error('Gym ID is required to fetch payments');

    let query = supabase
      .from('payments')
      .select(`
        *,
        members (
          full_name,
          phone_number
        ),
        subscriptions (
          plan_name
        )
      `)
      .eq('gym_id', gymId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (page !== null && pageSize !== null) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    } else {
      // SECURITY/PERFORMANCE FIX: Hard limit to prevent browser OOM crashes
      query = query.limit(2000);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  // Record a new payment
  async createPayment(gymId, paymentData) {
    const { data, error } = await supabase
      .from('payments')
      .insert([
        { 
          gym_id: gymId,
          member_id: paymentData.member_id,
          subscription_id: paymentData.subscription_id || null,
          amount_paid: paymentData.amount_paid,
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          payment_status: paymentData.payment_status || 'paid',
          notes: paymentData.notes
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Trigger instant push notification to Member if profile is linked
    if (paymentData.member_id) {
      supabase
        .from('members')
        .select('id, full_name, profile_id')
        .eq('id', paymentData.member_id)
        .maybeSingle()
        .then(({ data: member }) => {
          if (member?.profile_id) {
            pushNotificationService.notifyPaymentReceived(gymId, member, paymentData.amount_paid).catch(() => {});
          }
        })
        .catch(() => {});
    }

    return data;
  },

  // Update a payment
  async updatePayment(id, paymentData) {
    const { data, error } = await supabase
      .from('payments')
      .update(paymentData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a payment
  async deletePayment(id) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Calculate total revenue for a specific gym
  async getTotalRevenue(gymId) {
    if (!gymId) throw new Error('Gym ID is required to calculate revenue');

    const { data, error } = await supabase
      .from('payments')
      .select('amount_paid')
      .eq('payment_status', 'paid')
      .eq('gym_id', gymId);

    if (error) throw error;
    
    // Sum up the amounts
    const total = data.reduce((sum, payment) => sum + Number(payment.amount_paid), 0);
    return total;
  }
};
