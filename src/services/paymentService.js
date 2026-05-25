import { supabase } from '../lib/supabaseClient';

export const paymentService = {
  // Get all payments for a specific gym (protects against Super Admin leakage in dashboard)
  async getAllPayments(gymId) {
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
      `);

    if (gymId) {
      query = query.eq('gym_id', gymId);
    }

    const { data, error } = await query
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

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

  // Calculate total revenue
  async getTotalRevenue() {
    const { data, error } = await supabase
      .from('payments')
      .select('amount_paid')
      .eq('payment_status', 'paid');

    if (error) throw error;
    
    // Sum up the amounts
    const total = data.reduce((sum, payment) => sum + Number(payment.amount_paid), 0);
    return total;
  }
};
