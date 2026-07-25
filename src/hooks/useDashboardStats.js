import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useGym } from './useGym';

export const toLocalDateStr = (val) => {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (str.length >= 10 && str.charAt(4) === '-' && str.charAt(7) === '-') {
    return str.slice(0, 10);
  }
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    const y = parsedDate.getFullYear();
    const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const d = String(parsedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};

export function invalidateDashboardStatsCache(gymId) {
  if (!gymId) return;
  try {
    localStorage.removeItem(`gym_dashboard_stats_cache_${gymId}`);
  } catch (e) {
    console.error('Error clearing stats cache:', e);
  }
}

export function useDashboardStats() {
  const { gym } = useGym();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async (isBackground = false) => {
    if (!gym) {
      setLoading(false);
      return;
    }
    
    const cacheKey = `gym_dashboard_stats_cache_${gym.id}`;

    // Populating cache instantly to prevent screen flicker
    if (!isBackground) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setStats(parsed);
          setLoading(false);
        } catch (e) {
          console.warn('[Cache] Failed parsing cached stats:', e);
        }
      }
    }

    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (!isBackground && !cachedData) {
        setLoading(true);
      }
      setError(null);

      // Lazy background database status sync for expired members and subscriptions (throttled to once every 6 hours)
      const syncDatabaseStatuses = async (gymId) => {
        const syncCacheKey = `gymix_last_db_sync_${gymId}`;
        const lastSync = localStorage.getItem(syncCacheKey);
        const now = Date.now();
        
        // Throttling safety: check if 6 hours (21,600,000 ms) have passed
        if (lastSync && (now - Number(lastSync)) < 21600000) {
          console.log('[Gymix Sync] DB status sync skipped (throttled).');
          return;
        }

        try {
          const todayObj = new Date();
          const year = todayObj.getFullYear();
          const month = String(todayObj.getMonth() + 1).padStart(2, '0');
          const day = String(todayObj.getDate()).padStart(2, '0');
          const todayStr = `${year}-${month}-${day}`;

          console.log('[Gymix Sync] Executing database status sync for today:', todayStr);

          // 1. Find and update expired members in DB
          const { data: expiredMembers } = await supabase
            .from('members')
            .select('id')
            .eq('gym_id', gymId)
            .in('status', ['active', 'expiring_soon'])
            .lt('expiry_date', todayStr);

          if (expiredMembers && expiredMembers.length > 0) {
            const ids = expiredMembers.map(m => m.id);
            await supabase
              .from('members')
              .update({ status: 'expired' })
              .in('id', ids);
          }

          // 2. Find and update expired subscriptions in DB
          const { data: expiredSubs } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('gym_id', gymId)
            .eq('status', 'active')
            .lt('expiry_date', todayStr);

          if (expiredSubs && expiredSubs.length > 0) {
            const ids = expiredSubs.map(s => s.id);
            await supabase
              .from('subscriptions')
              .update({ status: 'expired' })
              .in('id', ids);
          }

          // Mark sync timestamp
          localStorage.setItem(syncCacheKey, String(now));
        } catch (syncErr) {
          console.error('[Gymix Sync] Error syncing expired statuses in database:', syncErr);
        }
      };

      // Run database status synchronization in the background
      syncDatabaseStatuses(gym.id).catch(console.error);

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
        .order('created_at', { ascending: false })
        .limit(5000);

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
        const cleanMember = { ...member };
        if (cleanMember.status === 'left') {
          delete cleanMember.subscriptions;
          return cleanMember;
        }

        const latest = getLatestSubscription(cleanMember.subscriptions);
        if (!latest) {
          delete cleanMember.subscriptions;
          return {
            ...cleanMember,
            status: getStatusFromExpiry(cleanMember.expiry_date),
          };
        }

        delete cleanMember.subscriptions;
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
          payment_method,
          created_at,
          members (full_name)
        `)
        .eq('gym_id', gym.id)
        .order('created_at', { ascending: false })
        .limit(5000);

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
      // Calculate Dates in local timezone to prevent UTC timezone-shifting bugs
      const today = new Date();
      const todayStr = toLocalDateStr(today);
      const startOfMonth = toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
      
      const next3Days = new Date(today);
      next3Days.setDate(today.getDate() + 3);
      const next3DaysStr = toLocalDateStr(next3Days);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const todayStartISO = startOfToday.toISOString();
      const todayEndISO = endOfToday.toISOString();
      const { data: attendanceToday, error: attendanceError } = await supabase
        .from('attendance')
        .select('id')
        .eq('gym_id', gym.id)
        .gte('check_in_time', todayStartISO)
        .lte('check_in_time', todayEndISO);

      if (attendanceError) console.error('Error fetching today attendance:', attendanceError);
      const todayCheckIns = (attendanceToday ?? []).length;

      // --- Fetch Shop/Store Orders (Completed for Revenue, All for other calculations if needed) ---
      let storeOrdersList = [];
      try {
        const { data: storeOrders, error: storeOrdersError } = await supabase
          .from('store_orders')
          .select('total_amount, status, created_at')
          .eq('gym_id', gym.id);
        
        if (!storeOrdersError && storeOrders) {
          storeOrdersList = storeOrders.filter(o => o.status === 'completed');
        }
      } catch (storeErr) {
        console.error('Error computing store stats:', storeErr);
      }

      // --- Membership Metrics ---
      const membershipStats = {
        total: members.filter(m => m.status !== 'left').length,
        active: members.filter(m => m.status === 'active').length,
        expiringSoon: members.filter(m => m.status === 'expiring_soon').length,
        expired: members.filter(m => m.status === 'expired').length,
        left: members.filter(m => m.status === 'left').length,
      };

      const activeMembersCount = membershipStats.active;
      const attendanceRate = activeMembersCount > 0 ? Number(((todayCheckIns / activeMembersCount) * 100).toFixed(1)) : 0;

      // --- Revenue Metrics ---
      let subTotalRevenue = 0;
      let subMonthlyRevenue = 0;
      let subTodayRevenue = 0;
      let subYearlyRevenue = 0;
      let pendingAmount = 0;

      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      const oneYearAgoStr = toLocalDateStr(oneYearAgo);

      // Payment Method classification
      let upiVolume = 0;
      let cashVolume = 0;
      let cardVolume = 0;
      let bankVolume = 0;
      let upiCount = 0;
      let cashCount = 0;
      let cardCount = 0;
      let bankCount = 0;

      paymentsList.forEach(p => {
        const amount = Number(p.amount_paid) || 0;
        if (p.payment_status === 'paid') {
          const pDateStr = toLocalDateStr(p.payment_date || p.created_at);
          subTotalRevenue += amount;
          if (pDateStr >= startOfMonth) subMonthlyRevenue += amount;
          if (pDateStr === todayStr) subTodayRevenue += amount;
          if (pDateStr >= oneYearAgoStr) subYearlyRevenue += amount;

          // Compute payment method splits cleanly
          const method = (p.payment_method || 'cash').toLowerCase();
          if (method.includes('upi') || method.includes('gpay') || method.includes('phonepe') || method.includes('online')) {
            upiVolume += amount;
            upiCount++;
          } else if (method.includes('card') || method.includes('debit') || method.includes('credit')) {
            cardVolume += amount;
            cardCount++;
          } else if (method.includes('bank') || method.includes('transfer') || method.includes('netbanking')) {
            bankVolume += amount;
            bankCount++;
          } else {
            cashVolume += amount;
            cashCount++;
          }
        } else if (p.payment_status === 'pending' || p.payment_status === 'overdue') {
          pendingAmount += amount;
        }
      });

      // Sum store order revenue in respective timeframes using toLocalDateStr
      let storeMonthlyRevenue = 0;
      let storeTodayRevenue = 0;
      let storeYearlyRevenue = 0;
      let storeTotalRevenueCalculated = 0;

      storeOrdersList.forEach(o => {
        const amount = Number(o.total_amount) || 0;
        const orderDateStr = toLocalDateStr(o.created_at);
        storeTotalRevenueCalculated += amount;
        if (orderDateStr >= startOfMonth) storeMonthlyRevenue += amount;
        if (orderDateStr === todayStr) storeTodayRevenue += amount;
        if (orderDateStr >= oneYearAgoStr) storeYearlyRevenue += amount;
      });

      // Combined Revenue Metrics
      const totalRevenue = subTotalRevenue + storeTotalRevenueCalculated;
      const monthlyRevenue = subMonthlyRevenue + storeMonthlyRevenue;
      const todayRevenue = subTodayRevenue + storeTodayRevenue;
      const yearlyRevenue = subYearlyRevenue + storeYearlyRevenue;

      const totalPaidCount = upiCount + cashCount + cardCount + bankCount;
      const paymentMethods = {
        upiPercent: totalPaidCount > 0 ? Math.round((upiCount / totalPaidCount) * 100) : 0,
        cashPercent: totalPaidCount > 0 ? Math.round((cashCount / totalPaidCount) * 100) : 0,
        cardPercent: totalPaidCount > 0 ? Math.round((cardCount / totalPaidCount) * 100) : 0,
        bankPercent: totalPaidCount > 0 ? Math.round((bankCount / totalPaidCount) * 100) : 0,
        upiVolume,
        cashVolume,
        cardVolume,
        bankVolume
      };

      const revenueStats = {
        total: totalRevenue,
        monthly: monthlyRevenue,
        today: todayRevenue,
        pending: pendingAmount,
        yearly: yearlyRevenue,
        store: storeTotalRevenueCalculated // Store standalone sales for separate display
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
        ...members.slice(0, 8).map(m => ({
          id: m.id,
          type: 'member_joined',
          title: 'New Member Joined',
          description: `${m.full_name} joined the gym.`,
          date: m.created_at
        })),
        ...paymentsList.slice(0, 8).map(p => ({
          id: p.id,
          type: p.payment_status === 'paid' ? 'payment_received' : 'payment_pending',
          title: p.payment_status === 'paid' ? 'Payment Received' : 'Payment Pending',
          description: `₹${p.amount_paid} from ${p.members?.full_name || 'Member'}.`,
          date: p.created_at
        }))
      ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8); // top 8 activities

      // --- 6-Month Monthly Revenue Trend (Combined subscriptions + store sales) ---
      const chartDataMap = {};
      const monthsArray = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = toLocalDateStr(d).slice(0, 7); // "YYYY-MM"
        const displayLabel = d.toLocaleDateString('en-US', { month: 'short' }); // "Jan", "Feb" etc.
        chartDataMap[monthKey] = { label: displayLabel, month: monthKey, value: 0 };
        monthsArray.push(monthKey);
      }

      paymentsList.forEach(p => {
        if (p.payment_status === 'paid') {
          const monthKey = toLocalDateStr(p.payment_date || p.created_at).slice(0, 7); // "YYYY-MM"
          if (chartDataMap[monthKey]) {
            chartDataMap[monthKey].value += Number(p.amount_paid) || 0;
          }
        }
      });

      storeOrdersList.forEach(o => {
        const orderDateStr = toLocalDateStr(o.created_at);
        const monthKey = orderDateStr.slice(0, 7); // "YYYY-MM"
        if (chartDataMap[monthKey]) {
          chartDataMap[monthKey].value += Number(o.total_amount) || 0;
        }
      });

      const revenueChartData = monthsArray.map(mKey => chartDataMap[mKey]);

      // --- Calculate MTD target date for previous month (e.g. July 8th -> June 8th MTD) ---
      const getPrevMonthDateMTD = (d) => {
        const prev = new Date(d.getFullYear(), d.getMonth() - 1, d.getDate());
        if (prev.getMonth() === d.getMonth()) {
          return new Date(d.getFullYear(), d.getMonth(), 0);
        }
        return prev;
      };

      const prevMonthMTDDate = getPrevMonthDateMTD(today);
      const prevMonthMTDStr = toLocalDateStr(prevMonthMTDDate);
      const startOfPrevMonth = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1));

      // --- Revenue Trends & Growth (MTD Combined) ---
      let prevMonthCombinedRevenue = 0;
      paymentsList.forEach(p => {
        const amount = Number(p.amount_paid) || 0;
        if (p.payment_status === 'paid') {
          const pDate = toLocalDateStr(p.payment_date || p.created_at);
          if (pDate >= startOfPrevMonth && pDate <= prevMonthMTDStr) {
            prevMonthCombinedRevenue += amount;
          }
        }
      });

      storeOrdersList.forEach(o => {
        const amount = Number(o.total_amount) || 0;
        const orderDateStr = toLocalDateStr(o.created_at);
        if (orderDateStr >= startOfPrevMonth && orderDateStr <= prevMonthMTDStr) {
          prevMonthCombinedRevenue += amount;
        }
      });
      
      let revenueTrendVal = 0;
      if (prevMonthCombinedRevenue > 0) {
        revenueTrendVal = ((monthlyRevenue - prevMonthCombinedRevenue) / prevMonthCombinedRevenue) * 100;
      } else if (monthlyRevenue > 0) {
        revenueTrendVal = 100;
      }
      const revenueTrend = revenueTrendVal >= 0 
        ? `+${revenueTrendVal.toFixed(1)}% MoM (MTD)` 
        : `${revenueTrendVal.toFixed(1)}% MoM (MTD)`;

      // --- Member Trends & Growth ---
      const thisMonthSignups = members.filter(m => m.join_date >= startOfMonth).length;
      const prevMonthSignups = members.filter(m => m.join_date >= startOfPrevMonth && m.join_date < startOfMonth).length;
      
      let memberTrendVal = 0;
      if (prevMonthSignups > 0) {
        memberTrendVal = ((thisMonthSignups - prevMonthSignups) / prevMonthSignups) * 100;
      } else if (thisMonthSignups > 0) {
        memberTrendVal = 100;
      }
      const memberTrend = memberTrendVal > 0 
        ? `+${memberTrendVal.toFixed(1)}% MoM` 
        : memberTrendVal < 0 
          ? `${memberTrendVal.toFixed(1)}% MoM`
          : "Stable";

      // --- Pending Payments Trend ---
      const pendingCount = paymentsList.filter(p => p.payment_status === 'pending' || p.payment_status === 'overdue').length;
      const pendingTrend = pendingAmount > 0 ? `${pendingCount} invoices` : "No dues";

      const calculatedStats = {
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
        genderStats,
        trends: {
          revenue: revenueTrend,
          membership: memberTrend,
          pending: pendingTrend
        }
      };

      setStats(calculatedStats);
      localStorage.setItem(cacheKey, JSON.stringify(calculatedStats));

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gym]);

  useEffect(() => {
    let mounted = true;
    if (gym) {
      const cacheKey = `gym_dashboard_stats_cache_${gym.id}`;
      const hasCache = !!localStorage.getItem(cacheKey);
      
      setTimeout(() => {
        if (mounted) fetchStats(hasCache);
      }, 0);
    }
    return () => {
      mounted = false;
    };
  }, [fetchStats, gym]);

  return {
    stats,
    loading,
    error,
    fetchStats
  };
}
