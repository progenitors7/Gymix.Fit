import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useGym } from './useGym';

export function useDashboardStats() {
  const { gym } = useGym();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!gym) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Fetch all members for this gym with their subscriptions
      const { data: rawMembers, error: membersError } = await supabase
        .from('members')
        .select(`
          id, gym_id, full_name, phone_number, gender,
          join_date, membership_plan, expiry_date, status, notes, created_at,
          subscriptions (
            id,
            plan_name,
            expiry_date,
            status,
            start_date,
            created_at
          )
        `)
        .eq('gym_id', gym.id)
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;

      // Sync member statuses from their latest subscriptions to ensure exact accuracy
      const getStatusFromExpiry = (expiryDate) => {
        if (!expiryDate) return 'active';

        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((expiry - todayDate) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) return 'expired';
        if (daysLeft <= 7) return 'expiring_soon';
        return 'active';
      };

      const getLatestSubscription = (subs = []) => {
        return subs
          .filter((sub) => sub.expiry_date)
          .sort((a, b) => new Date(b.expiry_date) - new Date(a.expiry_date))[0];
      };

      const syncMemberFromLatestSubscription = (member) => {
        const latest = getLatestSubscription(member.subscriptions);
        if (!latest) {
          const { subscriptions, ...cleanMember } = member;
          return cleanMember;
        }

        const { subscriptions, ...cleanMember } = member;
        return {
          ...cleanMember,
          membership_plan: latest.plan_name || cleanMember.membership_plan,
          expiry_date: latest.expiry_date || cleanMember.expiry_date,
          status: getStatusFromExpiry(latest.expiry_date || cleanMember.expiry_date),
        };
      };

      const members = (rawMembers ?? []).map(syncMemberFromLatestSubscription);

      // Fetch all payments for this gym
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id, 
          amount_paid, 
          payment_date, 
          payment_status, 
          created_at,
          members (full_name)
        `)
        .eq('gym_id', gym.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const paymentsList = payments ?? [];

      // Fetch pending connection requests count
      const { count: pendingRequestsCount, error: requestsError } = await supabase
        .from('connection_requests')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gym.id)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;

      // Calculate Dates in local timezone to prevent UTC timezone-shifting bugs
      const today = new Date();
      
      const getLocalDateString = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const todayStr = getLocalDateString(today);
      const startOfMonth = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
      
      const next3Days = new Date(today);
      next3Days.setDate(today.getDate() + 3);
      const next3DaysStr = getLocalDateString(next3Days);

      // --- Fetch Today's Check-ins ---
      const todayStartISO = `${todayStr}T00:00:00.000Z`;
      const todayEndISO = `${todayStr}T23:59:59.999Z`;
      const { data: attendanceToday, error: attendanceError } = await supabase
        .from('attendance')
        .select('id')
        .eq('gym_id', gym.id)
        .gte('check_in_time', todayStartISO)
        .lte('check_in_time', todayEndISO);

      if (attendanceError) console.error('Error fetching today attendance:', attendanceError);
      const todayCheckIns = (attendanceToday ?? []).length;

      // --- Membership Metrics ---
      const membershipStats = {
        total: members.length,
        active: members.filter(m => m.status === 'active').length,
        expiringSoon: members.filter(m => m.status === 'expiring_soon').length,
        expired: members.filter(m => m.status === 'expired').length,
      };

      const activeMembersCount = membershipStats.active;
      const attendanceRate = activeMembersCount > 0 ? Number(((todayCheckIns / activeMembersCount) * 100).toFixed(1)) : 0;

      // --- Revenue Metrics ---
      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let todayRevenue = 0;
      let pendingAmount = 0;

      // UPI vs Cash split
      let upiVolume = 0;
      let cashVolume = 0;
      let upiCount = 0;
      let cashCount = 0;

      paymentsList.forEach(p => {
        const amount = Number(p.amount_paid);
        if (p.payment_status === 'paid') {
          totalRevenue += amount;
          if (p.payment_date >= startOfMonth) monthlyRevenue += amount;
          if (p.payment_date === todayStr) todayRevenue += amount;

          // Compute payment method splits
          const method = (p.payment_method || 'cash').toLowerCase();
          if (method.includes('upi') || method.includes('gpay') || method.includes('phonepe') || method.includes('online')) {
            upiVolume += amount;
            upiCount++;
          } else {
            cashVolume += amount;
            cashCount++;
          }
        } else if (p.payment_status === 'pending' || p.payment_status === 'overdue') {
          pendingAmount += amount;
        }
      });

      const totalPaidCount = upiCount + cashCount;
      const paymentMethods = {
        upiPercent: totalPaidCount > 0 ? Math.round((upiCount / totalPaidCount) * 100) : 0,
        cashPercent: totalPaidCount > 0 ? Math.round((cashCount / totalPaidCount) * 100) : 0,
        upiVolume,
        cashVolume
      };

      const revenueStats = {
        total: totalRevenue,
        monthly: monthlyRevenue,
        today: todayRevenue,
        pending: pendingAmount,
      };

      // --- Membership Tier Distribution ---
      const planDistribution = {};
      members.forEach(m => {
        if (m.status === 'active') {
          const planName = m.membership_plan || 'General Access';
          planDistribution[planName] = (planDistribution[planName] || 0) + 1;
        }
      });

      // --- Gender Demographic Splits ---
      let maleCount = 0;
      let femaleCount = 0;
      let otherGenderCount = 0;
      members.forEach(m => {
        if (m.status === 'active') {
          const gender = (m.gender || 'male').toLowerCase();
          if (gender === 'male') maleCount++;
          else if (gender === 'female') femaleCount++;
          else otherGenderCount++;
        }
      });

      const genderStats = {
        male: maleCount,
        female: femaleCount,
        other: otherGenderCount
      };

      // --- Widgets Data ---
      // 1. Pending/Overdue Payments
      const pendingPaymentsList = paymentsList
        .filter(p => p.payment_status !== 'paid')
        .slice(0, 5); // top 5

      // 2. Expiring Members
      const expiringMembersList = members
        .filter(m => m.expiry_date <= next3DaysStr && m.expiry_date >= todayStr)
        .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
        .slice(0, 5);

      // 3. Recent Activity (Mix of new members and recent payments)
      const recentActivity = [
        ...members.map(m => ({
          id: m.id,
          type: 'member_joined',
          title: 'New Member Joined',
          description: `${m.full_name} joined the gym.`,
          date: m.created_at
        })),
        ...paymentsList.map(p => ({
          id: p.id,
          type: p.payment_status === 'paid' ? 'payment_received' : 'payment_pending',
          title: p.payment_status === 'paid' ? 'Payment Received' : 'Payment Pending',
          description: `₹${p.amount_paid} from ${p.members?.full_name || 'Member'}.`,
          date: p.created_at
        }))
      ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8); // top 8 activities

      // --- Lightweight Chart Data (Revenue Trend last 7 days) ---
      const chartDataMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = getLocalDateString(d);
        const displayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        chartDataMap[dateStr] = { label: displayLabel, date: dateStr, value: 0 };
      }

      paymentsList.forEach(p => {
        if (p.payment_status === 'paid' && chartDataMap[p.payment_date]) {
          chartDataMap[p.payment_date].value += Number(p.amount_paid);
        }
      });

      const revenueChartData = Object.values(chartDataMap);

      setStats({
        membership: membershipStats,
        revenue: revenueStats,
        pendingPayments: pendingPaymentsList,
        expiringMembers: expiringMembersList,
        recentActivity: recentActivity,
        revenueChartData: revenueChartData,
        pendingRequestsCount: pendingRequestsCount || 0,
        todayCheckIns,
        attendanceRate,
        planDistribution,
        paymentMethods,
        genderStats
      });

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gym]);

  useEffect(() => {
    let mounted = true;
    if (gym && !stats && !error) {
      setTimeout(() => {
        if (mounted) fetchStats();
      }, 0);
    }
    return () => {
      mounted = false;
    };
  }, [fetchStats, gym, stats, error]);

  return {
    stats,
    loading,
    error,
    fetchStats
  };
}
