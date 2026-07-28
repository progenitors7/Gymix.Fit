import { supabase } from '../lib/supabaseClient';

export const superAdminService = {
  /**
   * Fetch platform-wide statistics for the Super Admin Dashboard.
   * NOTE: This requires RLS policies that allow the user to read all rows
   * or a service role key (which we avoid on client-side).
   */
  async getPlatformStats() {
    try {
      const allGyms = await this.getAllGyms();
      
      const { count: memberCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      const { data: saasPayments } = await supabase
        .from('saas_subscriptions')
        .select('amount')
        .not('amount', 'is', null);

      const totalRevenue = (saasPayments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

      const recentGymsCount = allGyms.filter(g => new Date(g.created_at) >= thirtyDaysAgo).length;
      const previousGymsCount = allGyms.filter(g => {
        const d = new Date(g.created_at);
        return d >= sixtyDaysAgo && d < thirtyDaysAgo;
      }).length;

      let growthRate = 0;
      if (previousGymsCount === 0) {
        growthRate = recentGymsCount > 0 ? 100 : 0;
      } else {
        growthRate = Math.round(((recentGymsCount - previousGymsCount) / previousGymsCount) * 100);
      }

      const activeGyms = allGyms.filter(g => g.status === 'active').length;
      const expiredGyms = allGyms.filter(g => g.status === 'expired').length;
      const pendingGyms = allGyms.filter(g => g.status === 'pending').length;
      const blockedGyms = allGyms.filter(g => g.status === 'blocked').length;

      return {
        totalGyms: allGyms.length,
        activeGyms,
        expiredGyms,
        pendingGyms,
        blockedGyms,
        totalMembers: memberCount || 0,
        totalRevenue,
        recentGyms: recentGymsCount,
        growthRate,
        allGyms
      };
    } catch (error) {
      console.error('SuperAdmin Stats Error:', error);
      throw error;
    }
  },

  /**
   * Fetch all registered gyms with their status and metadata.
   */
  async getAllGyms() {
    const { data: gyms, error: gymsError } = await supabase
      .from('gyms')
      .select('*, saas_plans(*), saas_subscriptions(*)')
      .order('created_at', { ascending: false });
    
    if (gymsError) throw gymsError;

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .limit(500);
      
      const profileMap = {};
      profiles?.forEach(p => {
        profileMap[p.id] = p;
      });

      const now = new Date();

      // Check local SuperAdmin date override cache for client-side persistence
      let customExpiries = {};
      try {
        customExpiries = JSON.parse(localStorage.getItem('superadmin_gym_expiries') || '{}');
      } catch (e) {}

      return (gyms || []).map(gym => {
        const subs = gym.saas_subscriptions || [];
        const sortedSubs = [...subs].sort((a, b) => new Date(b.current_period_end || b.created_at || 0) - new Date(a.current_period_end || a.created_at || 0));
        const latestSub = sortedSubs[0];

        let expiresAt = null;
        if (customExpiries[gym.id]?.expiresAt) {
          expiresAt = new Date(customExpiries[gym.id].expiresAt);
        } else if (latestSub?.current_period_end) {
          expiresAt = new Date(latestSub.current_period_end);
        } else if (gym.created_at) {
          // If no explicit subscription record exists, calculate based on assigned plan tier
          let months = 3;
          const planName = (gym.saas_plans?.name || '').toLowerCase();
          if (planName.includes('1 month')) months = 1;
          else if (planName.includes('12 month')) months = 12;

          const created = new Date(gym.created_at);
          created.setMonth(created.getMonth() + months);
          expiresAt = created;
        }

        let daysLeft = null;
        if (expiresAt) {
          daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Real-time status logic:
        // Priority: blocked > expired > pending > active
        let computedStatus = gym.status || 'pending';
        if (gym.status === 'blocked') {
          computedStatus = 'blocked';
        } else if (daysLeft !== null && daysLeft < 0 && gym.status !== 'pending') {
          computedStatus = 'expired';
        } else if (gym.status === 'pending' && !latestSub && !customExpiries[gym.id]) {
          computedStatus = 'pending';
        } else {
          computedStatus = 'active';
        }

        return {
          ...gym,
          status: computedStatus,
          raw_status: gym.status,
          owner_profile: profileMap[gym.owner_user_id] || null,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          days_left: daysLeft
        };
      });
    } catch (e) {
      console.error('[superAdminService] Error mapping owner profiles:', e);
      return gyms || [];
    }
  },

  /**
   * Update a gym's operational status (active, blocked, etc.)
   */
  async updateGymStatus(gymId, status) {
    const { data, error } = await supabase
      .from('gyms')
      .update({ status })
      .eq('id', gymId)
      .select()
      .single();
    
    if (error) throw error;

    // If blocked, also delete the owner user from auth.users to force fresh registration/block access
    if (status === 'blocked' && data?.owner_user_id) {
      try {
        await supabase.rpc('delete_user_by_admin', { target_user_id: data.owner_user_id });
      } catch (err) {
        console.error('[superAdminService] Failed to call delete_user_by_admin for blocked owner:', err);
      }
    }

    return data;
  },

  /**
   * Activate a gym account and insert an active SaaS subscription record for custom duration (days).
   */
  async activateGym(gymId, planId, durationDays = 30) {
    const now = new Date();
    const days = parseInt(durationDays, 10) || 30;
    const periodEnd = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

    // Save in SuperAdmin local cache for instant UI consistency
    try {
      const cache = JSON.parse(localStorage.getItem('superadmin_gym_expiries') || '{}');
      cache[gymId] = { expiresAt: periodEnd.toISOString(), planId, updatedAt: new Date().toISOString() };
      localStorage.setItem('superadmin_gym_expiries', JSON.stringify(cache));
    } catch (e) {
      console.warn('[superAdminService] Error updating local expiries cache:', e);
    }

    // 1. Update Gym status and SaaS plan
    const { data, error } = await supabase
      .from('gyms')
      .update({ 
        status: 'active',
        saas_plan_id: planId || null 
      })
      .eq('id', gymId)
      .select()
      .single();
    
    if (error) throw error;

    // 2. Insert an active saas_subscriptions record so getMyGym billing guard recognizes it
    const DEFAULT_PLAN_ID = '770f855a-535c-44f1-9604-0ba7a74c6f59'; // Fallback: 1 Month Pro Plan
    const safePlanId = planId || DEFAULT_PLAN_ID;

    const { error: subErr } = await supabase
      .from('saas_subscriptions')
      .insert([{
        gym_id: gymId,
        plan_id: safePlanId,
        status: 'active',
        amount: 0,
        currency: 'INR',
        payment_status: 'completed',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        duration_months: Math.max(1, Math.ceil(days / 30))
      }]);

    if (subErr) {
      console.error('[superAdminService] CRITICAL: saas_subscriptions insert failed:', subErr.message);
      throw new Error(`Gym status updated but subscription record failed to save: ${subErr.message}`);
    }

    return data;
  },

  /**
   * Activate or renew a gym subscription with EXACT start date and end date from date pickers.
   */
  async activateGymWithExactDates(gymId, planId, startDateStr, endDateStr, amount = 0, notes = '') {
    const startIso = startDateStr ? new Date(startDateStr).toISOString() : new Date().toISOString();
    // End ISO date set to end of target day (23:59:59)
    const endTarget = endDateStr ? new Date(`${endDateStr}T23:59:59.000Z`) : new Date(Date.now() + 30*24*60*60*1000);
    const endIso = endTarget.toISOString();

    // Save in SuperAdmin local cache for instant UI consistency
    try {
      const cache = JSON.parse(localStorage.getItem('superadmin_gym_expiries') || '{}');
      cache[gymId] = { expiresAt: endIso, planId, updatedAt: new Date().toISOString() };
      localStorage.setItem('superadmin_gym_expiries', JSON.stringify(cache));
    } catch (e) {
      console.warn('[superAdminService] Error updating local expiries cache:', e);
    }

    // 1. Update Gym status and plan
    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .update({
        status: 'active',
        saas_plan_id: planId || null
      })
      .eq('id', gymId)
      .select()
      .single();

    if (gymErr) throw gymErr;

    // 2. Insert subscription with exact dates
    const DEFAULT_PLAN_ID = '770f855a-535c-44f1-9604-0ba7a74c6f59'; // Fallback: 1 Month Pro Plan
    const safePlanId = planId || DEFAULT_PLAN_ID;

    const { error: subErr } = await supabase
      .from('saas_subscriptions')
      .insert([{
        gym_id: gymId,
        plan_id: safePlanId,
        status: 'active',
        amount: Number(amount) || 0,
        currency: 'INR',
        payment_status: 'completed',
        current_period_start: startIso,
        current_period_end: endIso,
        duration_months: 1
      }]);

    if (subErr) {
      console.error('[superAdminService] CRITICAL: saas_subscriptions insert failed:', subErr.message);
      throw new Error(`Gym status updated but subscription record failed to save: ${subErr.message}`);
    }

    return gym;
  },

  /**
   * Update gym module features and flags (WhatsApp Autopilot, Coins Engine, Biometrics, etc.)
   */
  async updateGymFeatureToggles(gymId, featureFlags) {
    const { data, error } = await supabase
      .from('gyms')
      .update(featureFlags)
      .eq('id', gymId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update any member/athlete details across the platform by SuperAdmin.
   */
  async updateMemberBySuperAdmin(memberId, payload) {
    const { data, error } = await supabase
      .from('members')
      .update(payload)
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new platform-wide broadcast announcement.
   */
  async createBroadcast(broadcast) {
    const { data, error } = await supabase
      .from('broadcasts')
      .insert([broadcast])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Send a direct system message to a specific gym owner.
   */
  async sendDirectMessage(gymId, messageData) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        gym_id: gymId,
        type: 'system_message',
        title: messageData.title,
        message: messageData.message,
        is_read: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Fetch all past broadcasts.
   */
  async getBroadcasts() {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Fetch all SaaS subscription tiers.
   */
  async getSaaSPlans() {
    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .order('price', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  /**
   * Create a new SaaS plan tier.
   */
  async createSaaSPlan(plan) {
    const { data, error } = await supabase
      .from('saas_plans')
      .insert([plan])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update an existing SaaS plan tier.
   */
  async updateSaaSPlan(planId, updates) {
    const { data, error } = await supabase
      .from('saas_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a SaaS plan tier.
   */
  async deleteSaaSPlan(planId) {
    const { error } = await supabase
      .from('saas_plans')
      .delete()
      .eq('id', planId);
    
    if (error) throw error;
    return true;
  },

  /**
   * Update a gym's SaaS subscription level.
   */
  async updateGymSaaSPlan(gymId, planId) {
    const { data, error } = await supabase
      .from('gyms')
      .update({ saas_plan_id: planId })
      .eq('id', gymId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Fetch all support tickets with gym details.
   */
  async getTickets() {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, gyms(gym_name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Update ticket status or add admin response.
   */
  async updateTicket(ticketId, updates) {
    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();
    
    if (error) throw error;

    // Send a real-time system notification to the gym owner when their ticket gets updated or replied to
    if (updates.admin_response?.trim() || updates.status) {
      try {
        let msg = '';
        if (updates.admin_response?.trim()) {
          msg = `Support has replied to your ticket "${data.subject}": "${updates.admin_response}"`;
        } else {
          msg = `Your support ticket "${data.subject}" status is now updated to "${updates.status.replace(/_/g, ' ')}"`;
        }
        
        await supabase
          .from('notifications')
          .insert({
            gym_id: data.gym_id,
            type: 'system_message',
            title: `Support Ticket Update`,
            message: msg,
            is_read: false,
            reference_id: data.id
          });
      } catch (notiError) {
        console.error('Failed to insert system notification for support ticket:', notiError);
      }
    }

    return data;
  },

  /**
   * Fetch global system configuration.
   */
  async getSystemSettings() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');
    
    if (error) throw error;
    return data;
  },

  /**
   * Update a global system setting (e.g. maintenance mode).
   */
  async updateSystemSetting(key, value) {
    const { data, error } = await supabase
      .from('system_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a broadcast announcement.
   */
  async deleteBroadcast(id) {
    const { error } = await supabase
      .from('broadcasts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  /**
   * Fetch active broadcasts for users (e.g., last 24-48 hours).
   */
  async getActiveBroadcasts() {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3); // Only show the most recent 3
    
    if (error) throw error;
    return data;
  },

  /**
   * Permanently delete a gym and all its associated data.
   */
  async deleteGym(gymId) {
    const { data, error } = await supabase.rpc('delete_gym_by_admin', { target_gym_id: gymId });
    if (error) throw error;
    return true;
  },

  /**
   * Fetch all SaaS subscriptions for all gyms (Billing History).
   */
  async getAllSaaSSubscriptions() {
    const { data, error } = await supabase
      .from('saas_subscriptions')
      .select('*, gyms(gym_name), saas_plans(name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Fetch all registered members/athletes across the platform with connected gym and profile metadata.
   */
  async getAllMembers() {
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        gyms (
          id,
          gym_name,
          unique_code
        ),
        profiles (
          email,
          avatar_url
        ),
        attendance (
          id
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    // Map check-in counts dynamically
    return (data || []).map(member => ({
      ...member,
      check_in_count: member.attendance?.length || 0
    }));
  },

  /**
   * Permanently delete a member/athlete from the database and linked profile.
   */
  async deleteMember(memberId) {
    if (!memberId) throw new Error('Member ID is required');

    // BUG #18 FIX: Use secure atomic RPC instead of vulnerable frontend cascade deletes.
    const { error } = await supabase.rpc('delete_member_by_admin', { target_member_id: memberId });
    
    if (error) {
      console.error('[superAdminService] Error deleting member via RPC:', error);
      throw error;
    }
    
    return true;
  },

  /**
   * Fetch real database-driven health metrics.
   */
  async getSystemHealth() {
    try {
      const startTime = performance.now();
      
      // Perform database ping count to measure response latency
      const { count: profileCount, error: pingErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
        
      const endTime = performance.now();
      const pingLatency = Math.round(endTime - startTime);

      if (pingErr) throw pingErr;

      // Count rows in key tables for real-time diagnostics
      const { count: gymsCount } = await supabase.from('gyms').select('*', { count: 'exact', head: true });
      const { count: membersCount } = await supabase.from('members').select('*', { count: 'exact', head: true });
      const { count: paymentsCount } = await supabase.from('payments').select('*', { count: 'exact', head: true });
      const { count: ticketsCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true });
      const { count: openTicketsCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
      const { count: saasSubsCount } = await supabase.from('saas_subscriptions').select('*', { count: 'exact', head: true });
      const { count: broadcastsCount } = await supabase.from('broadcasts').select('*', { count: 'exact', head: true });

      // Retrieve system settings
      const { data: settings } = await supabase.from('system_settings').select('*');

      return {
        databaseStatus: 'Connected',
        latency: `${pingLatency}ms`,
        dbEngine: 'PostgreSQL 17.6',
        metrics: {
          gyms: gymsCount || 0,
          members: membersCount || 0,
          payments: paymentsCount || 0,
          tickets: ticketsCount || 0,
          openTickets: openTicketsCount || 0,
          saasSubs: saasSubsCount || 0,
          broadcasts: broadcastsCount || 0
        },
        settings: settings || []
      };
    } catch (error) {
      console.error('[superAdminService] System Health diagnostics failed:', error);
      throw error;
    }
  }
};
