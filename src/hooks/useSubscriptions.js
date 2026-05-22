import { useState, useCallback } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { useCurrentGym } from './useCurrentGym';

export function useSubscriptions() {
  const { gym, isReady } = useCurrentGym();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!isReady) {
      setLoading(false);
      return;
    };
    
    try {
      setLoading(true);
      setError(null);
      const data = await subscriptionService.getAllSubscriptions();
      setSubscriptions(data ?? []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isReady]);

  const addSubscription = async (subscriptionData) => {
    try {
      setLoading(true);
      setError(null);
      const newSubscription = await subscriptionService.createSubscription(gym.id, subscriptionData);
      // We refetch to get the joined member data
      await fetchSubscriptions();
      return newSubscription;
    } catch (err) {
      console.error('Error adding subscription:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (id, subscriptionData) => {
    try {
      setLoading(true);
      setError(null);
      await subscriptionService.updateSubscription(id, subscriptionData);
      await fetchSubscriptions();
    } catch (err) {
      console.error('Error updating subscription:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeSubscription = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await subscriptionService.deleteSubscription(id);
      setSubscriptions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting subscription:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    subscriptions,
    loading,
    error,
    fetchSubscriptions,
    addSubscription,
    updateSubscription,
    removeSubscription
  };
}
