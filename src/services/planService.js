import { supabase } from '../lib/supabaseClient';

export const planService = {
  async getPlans(gymId) {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Inject a Free Trial option if it's not already in the DB
    const hasTrial = data.some(p => p.name.toLowerCase().includes('trial'));
    if (!hasTrial) {
      data.unshift({
        id: 'trial_default',
        name: 'Free Trial (3 Days)',
        duration_days: 3,
        price: 0,
        gym_id: gymId
      });
    }
    
    return data;
  },

  async createPlan(gymId, planData) {
    const { data, error } = await supabase
      .from('membership_plans')
      .insert([{ ...planData, gym_id: gymId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePlan(id, planData, gymId = null) {
    if (id === 'trial_default') {
      const targetGymId = gymId || planData.gym_id;
      if (!targetGymId) throw new Error('Gym ID is required to customize trial plan');
      return this.createPlan(targetGymId, planData);
    }

    const { data, error } = await supabase
      .from('membership_plans')
      .update(planData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePlan(id) {
    if (id === 'trial_default') {
      return true;
    }

    const { error } = await supabase
      .from('membership_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};
