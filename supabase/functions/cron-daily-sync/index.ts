// @ts-nocheck - This file runs on Supabase Edge Runtime (Deno), not Node.js.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-cron',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Secure the cron endpoint: Ensure it's called with the Service Role Key or a secret
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader.replace('Bearer ', '') !== supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Must use Service Role Key.' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all active gyms and their owners
    const { data: gyms, error: gymsError } = await supabase
      .from('gyms')
      .select('id, owner_user_id')
      .in('status', ['active', 'pending']); // Exclude expired/blocked gyms

    if (gymsError) throw gymsError;
    if (!gyms || gyms.length === 0) {
      return new Response(JSON.stringify({ message: 'No active gyms found' }), { 
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    let totalNotificationsInserted = 0;

    for (const gym of gyms) {
      const gymId = gym.id;

      // Fetch members
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, full_name, status, expiry_date, membership_plan')
        .eq('gym_id', gymId);

      if (membersError || !members) continue;

      // Fetch recent notifications for this gym
      const { data: recentNotifs } = await supabase
        .from('notifications')
        .select('type, related_member_id, created_at')
        .eq('gym_id', gymId)
        .in('type', ['trial_ending', 'trial_expired', 'membership_expired', 'membership_expiring'])
        .gte('created_at', ninetyDaysAgo.toISOString());

      const newNotifications = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      members.forEach(m => {
        if (!m.expiry_date) return;
        
        const expiry = new Date(m.expiry_date);
        expiry.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const hasExistingNotif = (type, sinceDate) => {
          const existsInDb = (recentNotifs || []).some(n => 
            n.related_member_id === m.id && 
            n.type === type && 
            new Date(n.created_at) >= sinceDate
          );
          if (existsInDb) return true;
          return newNotifications.some(n => n.related_member_id === m.id && n.type === type);
        };

        // --- Trial logic ---
        if (m.status === 'trial') {
          if (diffDays === 0) {
            if (!hasExistingNotif('trial_ending', expiry)) {
              newNotifications.push({
                gym_id: gymId,
                related_member_id: m.id,
                type: 'trial_ending',
                title: 'Trial Ending Today',
                message: `${m.full_name}'s trial ends today. Reach out to convert them!`,
                is_read: false
              });
            }
          } else if (diffDays < 0 && diffDays >= -30) {
            if (!hasExistingNotif('trial_expired', expiry)) {
              newNotifications.push({
                gym_id: gymId,
                related_member_id: m.id,
                type: 'trial_expired',
                title: 'Trial Expired',
                message: `${m.full_name}'s trial has expired.`,
                is_read: false
              });
            }
          }
        }
        
        // --- Active/Expired logic ---
        if (m.status === 'expired' || diffDays < 0) {
          if (diffDays >= -30 && m.status !== 'trial' && !hasExistingNotif('membership_expired', expiry)) {
            newNotifications.push({
              gym_id: gymId,
              related_member_id: m.id,
              type: 'membership_expired',
              title: 'Plan Expired',
              message: `${m.full_name}'s ${m.membership_plan || 'plan'} has expired.`,
              is_read: false
            });
          }
        } else if (m.status === 'expiring_soon' || (diffDays >= 0 && diffDays <= 3 && m.status !== 'trial')) {
          const expiringSince = new Date(expiry);
          expiringSince.setDate(expiringSince.getDate() - 3);
          
          if (!hasExistingNotif('membership_expiring', expiringSince)) {
            newNotifications.push({
              gym_id: gymId,
              related_member_id: m.id,
              type: 'membership_expiring',
              title: 'Plan Expiring Soon',
              message: `${m.full_name}'s ${m.membership_plan || 'plan'} expires in ${diffDays} days.`,
              is_read: false
            });
          }
        }
      });

      // Insert new notifications and trigger FCM logic
      if (newNotifications.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(newNotifications);
          
        if (!insertError && gym.owner_user_id) {
          totalNotificationsInserted += newNotifications.length;
          
          for (const notif of newNotifications) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'x-internal-cron': 'true'
                },
                body: JSON.stringify({
                  userIds: [gym.owner_user_id],
                  title: notif.title,
                  body: notif.message,
                  gymId: gymId,
                  type: notif.type,
                  relatedMemberId: notif.related_member_id,
                  data: { route: '/notifications', type: notif.type, gymId: gymId },
                })
              });
            } catch (pushErr) {
              console.warn('[Cron] FCM push failed:', pushErr);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Daily sync complete. Inserted ${totalNotificationsInserted} new notifications across ${gyms.length} gyms.` 
    }), { 
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in daily sync cron:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
