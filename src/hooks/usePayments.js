import { useState, useCallback, useEffect } from 'react';
import { paymentService } from '../services/paymentService';
import { useCurrentGym } from './useCurrentGym';
import { supabase } from '../lib/supabaseClient';
import { invalidateDashboardStatsCache } from './useDashboardStats';
import { useRealtimeSync } from './useRealtimeSync';

export function usePayments() {
  const { gymId, isReady } = useCurrentGym();
  const [payments, setPayments] = useState([]);
  const [storeOrders, setStoreOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayments = useCallback(async () => {
    if (!isReady) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch Subscription Payments
      const data = await paymentService.getAllPayments(gymId);
      setPayments(data ?? []);

      // 2. Fetch Completed Store Orders
      const { data: orders, error: ordersError } = await supabase
        .from('store_orders')
        .select(`
          *,
          members (
            full_name,
            phone_number
          )
        `)
        .eq('gym_id', gymId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5000);

      if (ordersError) throw ordersError;
      setStoreOrders(orders ?? []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isReady, gymId]);

  useEffect(() => {
    if (!isReady || !gymId) return;
    const timer = setTimeout(fetchPayments, 0);
    return () => clearTimeout(timer);
  }, [isReady, gymId, fetchPayments]);

  // Live Supabase Realtime Sync for payments and store orders
  useRealtimeSync({
    gymId,
    tables: ['payments', 'store_orders'],
    onUpdate: () => {
      fetchPayments();
    }
  });

  const addPayment = async (paymentData) => {
    try {
      setLoading(true);
      setError(null);
      const newPayment = await paymentService.createPayment(gymId, paymentData);
      invalidateDashboardStatsCache(gymId);
      await fetchPayments();
      return newPayment;
    } catch (err) {
      console.error('Error adding payment:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePayment = async (id, paymentData) => {
    try {
      setLoading(true);
      setError(null);
      await paymentService.updatePayment(id, paymentData);
      invalidateDashboardStatsCache(gymId);
      await fetchPayments();
    } catch (err) {
      console.error('Error updating payment:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removePayment = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await paymentService.deletePayment(id);
      invalidateDashboardStatsCache(gymId);
      setPayments(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    payments,
    storeOrders,
    loading,
    error,
    fetchPayments,
    addPayment,
    updatePayment,
    removePayment
  };
}
