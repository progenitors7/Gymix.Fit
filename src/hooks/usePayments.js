import { useState, useCallback } from 'react';
import { paymentService } from '../services/paymentService';
import { useCurrentGym } from './useCurrentGym';

export function usePayments() {
  const { gym, isReady } = useCurrentGym();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPayments = useCallback(async () => {
    if (!isReady) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await paymentService.getAllPayments();
      setPayments(data ?? []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isReady]);

  const addPayment = async (paymentData) => {
    try {
      setLoading(true);
      setError(null);
      const newPayment = await paymentService.createPayment(gym.id, paymentData);
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
    loading,
    error,
    fetchPayments,
    addPayment,
    updatePayment,
    removePayment
  };
}
