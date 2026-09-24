import { supabase } from '../lib/supabaseClient';

export const superAdminService = {
  /**
   * Fetch platform-wide statistics for the Super Admin Dashboard.
   * NOTE: This requires RLS policies that allow the user to read all rows
   * or a service role key (which we avoid on client-side).
   */
  async getPlatformStats() {
    try {
      // Clear manual UI overrides on hard sync so fresh DB data takes priority
      try { localStorage.removeItem('superadmin_gym_expiries'); } catch { /* ignore */ }

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
      } catch { /* ignore */ }

      return (gyms || []).map(gym => {
        const subs = gym.saas_subscriptions || [];
        const sortedSubs = [...subs].sort((a, b) => new Date(b.current_period_end || b.created_at || 0) - new Date(a.current_period_end || a.created_at || 0));
        const latestSub = sortedSubs[0];

        let expiresAt = null;
        const dbExpiry = latestSub?.current_period_end ? new Date(latestSub.current_period_end) : null;
        const customExpiry = customExpiries[gym.id]?.expiresAt ? new Date(customExpiries[gym.id].expiresAt) : null;

        if (dbExpiry && customExpiry) {
          // Use whichever is later so real payments override old manual admin activations
          expiresAt = dbExpiry > customExpiry ? dbExpiry : customExpiry;
        } else if (dbExpiry) {
          expiresAt = dbExpiry;
        } else if (customExpiry) {
          expiresAt = customExpiry;
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
        let computedStatus;
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
    const DEFAULT_PLAN_ID = '770f855a-535c-44f1-9604-0ba7a74c6f59'; // Fallback: 1 Month Pro Plan
    const safePlanId = planId || DEFAULT_PLAN_ID;
    const months = Math.max(1, Math.ceil(days / 30));

    // Save in SuperAdmin local cache for instant UI consistency
    try {
      const cache = JSON.parse(localStorage.getItem('superadmin_gym_expiries') || '{}');
      cache[gymId] = { expiresAt: periodEnd.toISOString(), planId: safePlanId, updatedAt: new Date().toISOString() };
      localStorage.setItem('superadmin_gym_expiries', JSON.stringify(cache));
    } catch (e) {
      console.warn('[superAdminService] Error updating local expiries cache:', e);
    }

    // 1. Try atomic PostgreSQL RPC function (bypasses RLS cleanly)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('activate_gym_subscription_by_admin', {
        target_gym_id: gymId,
        target_plan_id: safePlanId,
        start_date: now.toISOString(),
        end_date: periodEnd.toISOString(),
        duration_num_months: months,
        paid_amount: 0
      });

      if (!rpcError && rpcData?.success) {
        return rpcData;
      }
      if (rpcError) {
        console.warn('[superAdminService] RPC activate_gym_subscription_by_admin fallback:', rpcError.message);
      }
    } catch (rpcEx) {
      console.warn('[superAdminService] RPC activation fallback triggered:', rpcEx);
    }

    // 2. Direct Table Updates fallback
    const { data, error } = await supabase
      .from('gyms')
      .update({ 
        status: 'active',
        saas_plan_id: safePlanId 
      })
      .eq('id', gymId)
      .select()
      .single();
    
    if (error) throw error;

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
        duration_months: months
      }]);

    if (subErr) {
      console.warn('[superAdminService] saas_subscriptions insert note:', subErr.message);
    }

    return data;
  },

  /**
   * Activate or renew a gym subscription with EXACT start date and end date from date pickers.
   */
  async activateGymWithExactDates(gymId, planId, startDateStr, endDateStr, amount = 0) {
    const startIso = startDateStr ? new Date(startDateStr).toISOString() : new Date().toISOString();
    // End ISO date set to end of target day (23:59:59)
    const endTarget = endDateStr ? new Date(`${endDateStr}T23:59:59.000Z`) : new Date(Date.now() + 30*24*60*60*1000);
    const endIso = endTarget.toISOString();
    const DEFAULT_PLAN_ID = '770f855a-535c-44f1-9604-0ba7a74c6f59'; // Fallback: 1 Month Pro Plan
    const safePlanId = planId || DEFAULT_PLAN_ID;

    // Save in SuperAdmin local cache for instant UI consistency
    try {
      const cache = JSON.parse(localStorage.getItem('superadmin_gym_expiries') || '{}');
      cache[gymId] = { expiresAt: endIso, planId: safePlanId, updatedAt: new Date().toISOString() };
      localStorage.setItem('superadmin_gym_expiries', JSON.stringify(cache));
    } catch (e) {
      console.warn('[superAdminService] Error updating local expiries cache:', e);
    }

    // 1. Try atomic PostgreSQL RPC function
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('activate_gym_subscription_by_admin', {
        target_gym_id: gymId,
        target_plan_id: safePlanId,
        start_date: startIso,
        end_date: endIso,
        duration_num_months: 1,
        paid_amount: Number(amount) || 0
      });

      if (!rpcError && rpcData?.success) {
        return rpcData;
      }
      if (rpcError) {
        console.warn('[superAdminService] RPC exact dates activation fallback:', rpcError.message);
      }
    } catch (rpcEx) {
      console.warn('[superAdminService] RPC exact dates fallback triggered:', rpcEx);
    }

    // 2. Direct Table Updates fallback
    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .update({
        status: 'active',
        saas_plan_id: safePlanId
      })
      .eq('id', gymId)
      .select()
      .single();

    if (gymErr) throw gymErr;

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
      console.warn('[superAdminService] saas_subscriptions insert note:', subErr.message);
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
   * Fetch all athletes/members across all gyms for SuperAdmin Athletes Master.
   * Resilient implementation with fallback for foreign key joins.
   */
  /**
   * Fetch all athletes/members across all gyms for SuperAdmin Athletes Master.
   * Resilient implementation with optional pagination, search, and profile data attachment.
   */
  async getAllMembers(page = null, limit = null, search = '') {
    try {
      let query = supabase
        .from('members')
        .select('*, gyms(id, gym_name, unique_code)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (page !== null && limit !== null) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      let members = data || [];

      if (error) {
        console.warn('[superAdminService] Direct join on gyms failed, using separate query:', error);
        let rawQuery = supabase
          .from('members')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (search) {
          rawQuery = rawQuery.or(`full_name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`);
        }
        if (page !== null && limit !== null) {
          rawQuery = rawQuery.range((page - 1) * limit, page * limit - 1);
        }

        const { data: rawMembers, error: rawError } = await rawQuery;
        if (rawError) throw rawError;

        const { data: allGyms } = await supabase.from('gyms').select('id, gym_name, unique_code');
        const gymMap = {};
        (allGyms || []).forEach(g => { gymMap[g.id] = g; });

        members = (rawMembers || []).map(m => ({
          ...m,
          gyms: gymMap[m.gym_id] || null
        }));
      }

      // Attach profile information if profile_id exists
      const profileIds = members.map(m => m.profile_id).filter(Boolean);
      if (profileIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, avatar_url, full_name')
            .in('id', profileIds);

          const profileMap = {};
          (profiles || []).forEach(p => { profileMap[p.id] = p; });

          members = members.map(m => ({
            ...m,
            profiles: m.profile_id ? profileMap[m.profile_id] || null : null
          }));
        } catch (pErr) {
          console.warn('[superAdminService] Failed to attach profiles to members:', pErr);
        }
      }

      if (page !== null && limit !== null) {
        return {
          members,
          total: count || members.length,
          page,
          limit,
          totalPages: Math.ceil((count || members.length) / limit)
        };
      }

      return members;
    } catch (err) {
      console.error('[superAdminService] Error in getAllMembers:', err);
      throw err;
    }
  },

  /**
   * Permanently delete an athlete/member record across the platform via SuperAdmin.
   * Uses secure atomic RPC instead of vulnerable frontend cascade deletes.
   */
  async deleteMember(memberId) {
    if (!memberId) throw new Error('Member ID is required');

    const { error } = await supabase.rpc('delete_member_by_admin', { target_member_id: memberId });
    if (error) {
      console.error('[superAdminService] Error deleting member via RPC:', error);
      throw error;
    }
    return true;
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
   * Delete a platform-wide broadcast announcement.
   */
  async deleteBroadcast(broadcastId) {
    const { error } = await supabase
      .from('broadcasts')
      .delete()
      .eq('id', broadcastId);
    
    if (error) throw error;
    return true;
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
   * Fetch all support tickets with linked gym and user profiles.
   */
  async getTickets() {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        gyms (
          id,
          gym_name,
          unique_code
        ),
        profiles (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[superAdminService] Error fetching tickets:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Update ticket status or add admin response with real-time notification dispatch.
   */
  async updateTicket(ticketId, updates) {
    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();
    
    if (error) {
      console.error('[superAdminService] Error updating ticket:', error);
      throw error;
    }

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
    const { error } = await supabase.rpc('delete_gym_by_admin', { target_gym_id: gymId });
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
   * Fetch member demographics for platform analytics.
   */
  async getMemberDemographics() {
    const { data, error } = await supabase
      .from('members')
      .select('gender, status, created_at');
    
    if (error) throw error;
    return data;
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
          profiles: profileCount || 0,
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
  },

  /**
   * 1. Financials & SaaS Transactions Ledger
   */
  async getSaaSTransactions() {
    try {
      const { data, error } = await supabase
        .from('saas_subscriptions')
        .select(`
          *,
          gyms (
            id,
            gym_name,
            unique_code,
            owner_user_id
          ),
          saas_plans (
            id,
            name,
            price
          ),
          promo_codes (
            id,
            code,
            discount_type,
            discount_value
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[superAdminService] Error fetching SaaS transactions:', err);
      throw err;
    }
  },

  /**
   * 2. Store Orders Management
   */
  async getStoreOrders() {
    try {
      const { data, error } = await supabase
        .from('store_orders')
        .select(`
          *,
          gyms (
            id,
            gym_name,
            unique_code
          ),
          members (
            id,
            full_name,
            phone_number,
            profiles (
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[superAdminService] Error fetching store orders:', err);
      throw err;
    }
  },

  async updateStoreOrderStatus(orderId, status, notes = null) {
    try {
      const payload = { status };
      if (notes !== null) payload.notes = notes;
      const { data, error } = await supabase
        .from('store_orders')
        .update(payload)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[superAdminService] Error updating store order:', err);
      throw err;
    }
  },

  /**
   * 3. Native Firebase Push Notification Dispatcher
   */
  async getPushTokens() {
    try {
      // 1. Fetch push_tokens safely
      const { data, error } = await supabase
        .from('push_tokens')
        .select('*');

      if (error) {
        console.warn('[superAdminService] push_tokens query notice:', error.message);
        return [];
      }

      const tokens = data || [];
      if (tokens.length === 0) return [];

      // Sort by updated_at or created_at
      tokens.sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      // 2. Fetch associated profiles safely in a separate query to avoid missing FK relation errors
      const userIds = [...new Set(tokens.map(t => t.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .in('id', userIds);

          const profileMap = {};
          (profiles || []).forEach(p => {
            profileMap[p.id] = p;
          });

          return tokens.map(t => ({
            ...t,
            profiles: profileMap[t.user_id] || null
          }));
        } catch (profileErr) {
          console.warn('[superAdminService] Error loading profiles for tokens:', profileErr);
        }
      }

      return tokens;
    } catch (err) {
      console.error('[superAdminService] Error fetching push tokens:', err);
      return [];
    }
  },

  async dispatchPushNotification({ title, body, audience = 'all', route = '/dashboard', customData = {} }) {
    let edgeSuccess = false;
    let edgeError = null;

    // 1. Attempt Native FCM dispatch via Supabase Edge function
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title,
          body,
          audience,
          route,
          data: customData
        }
      });
      if (!error) {
        edgeSuccess = true;
      } else {
        edgeError = error.message;
        console.warn('[superAdminService] Edge function push notice:', error);
      }
    } catch (err) {
      edgeError = err.message;
      console.warn('[superAdminService] Edge function invoke failed:', err);
    }

    // 2. Dual-Delivery Fallback: Always record as in-app notification/broadcast
    // so users on web/PWA or without FCM tokens also receive the message!
    try {
      if (audience === 'owners') {
        const { data: gyms } = await supabase.from('gyms').select('id, owner_user_id');
        if (gyms && gyms.length > 0) {
          const notifs = gyms.map(g => ({
            gym_id: g.id,
            type: 'system_broadcast',
            title,
            message: body,
            is_read: false
          }));
          await supabase.from('notifications').insert(notifs);
        }
      } else {
        await supabase.from('broadcasts').insert([{
          title,
          message: body,
          type: 'info'
        }]);
      }
    } catch (inAppErr) {
      console.warn('[superAdminService] In-app fallback notice:', inAppErr);
    }

    return { success: true, edgeSuccess, edgeError };
  },

  /**
   * 4. User Security & Auth Governance
   */
  async getAllUserProfiles() {
    try {
      const [profilesRes, gymsRes, membersRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('gyms').select('id, gym_name, unique_code, owner_user_id, status'),
        supabase.from('members').select('id, full_name, profile_id, gym_id, gyms(gym_name)')
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const gymsByOwner = {};
      (gymsRes.data || []).forEach(g => {
        if (g.owner_user_id) gymsByOwner[g.owner_user_id] = g;
      });

      const membersByProfile = {};
      (membersRes.data || []).forEach(m => {
        if (m.profile_id) membersByProfile[m.profile_id] = m;
      });

      return (profilesRes.data || []).map(p => ({
        ...p,
        ownedGym: gymsByOwner[p.id] || null,
        memberRecord: membersByProfile[p.id] || null
      }));
    } catch (err) {
      console.error('[superAdminService] Error fetching user profiles:', err);
      throw err;
    }
  },

  async updateUserRole(profileId, newRole) {
    try {
      // 1. Try secure PostgreSQL RPC
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_user_role_by_admin', {
          target_user_id: profileId,
          new_role: newRole
        });
        if (!rpcError && rpcData) {
          return { id: profileId, role: newRole };
        }
      } catch (rpcEx) {
        console.warn('[superAdminService] updateUserRole RPC fallback:', rpcEx);
      }

      // 2. Direct Table Update fallback
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[superAdminService] Error updating user role:', err);
      throw err;
    }
  },

  async triggerPasswordReset(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[superAdminService] Error sending password reset email:', err);
      throw err;
    }
  },

  async deleteUser(profileId) {
    try {
      const { error } = await supabase.rpc('delete_user_by_admin', {
        target_user_id: profileId
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[superAdminService] Error deleting user via RPC:', err);
      throw err;
    }
  }
};

