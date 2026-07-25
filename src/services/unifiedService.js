import { subscriptionService } from './subscriptionService';
import { paymentService } from './paymentService';
import { updateMember } from './memberService';
import { invalidateDashboardStatsCache } from '../hooks/useDashboardStats';

const today = () => new Date().toISOString().split('T')[0];

const addDays = (dateString, days) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().split('T')[0];
};

const getStatusFromExpiry = (expiryDate) => {
  if (!expiryDate) return 'active';

  const current = new Date(today());
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry - current) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 7) return 'expiring_soon';
  return 'active';
};

const resolveRenewalDates = (planData, paymentData) => {
  const startDate = planData.start_date || paymentData?.payment_date || today();
  let expiryDate = planData.expiry_date;

  if (!expiryDate && planData.duration_days) {
    expiryDate = addDays(startDate, planData.duration_days);
  }

  if (!expiryDate && planData.duration_type && planData.duration_type !== 'custom') {
    expiryDate = subscriptionService.calculateExpiryDate(startDate, planData.duration_type);
  }

  return { startDate, expiryDate };
};

/**
 * Unified service for handling "Smart Actions" that involve multiple tables.
 */
export const unifiedService = {
  /**
   * Smart Renew: Creates a subscription and a payment record in one go.
   * This triggers the DB to update the member's status and expiry.
   */
  async smartRenew(gymId, memberId, planData, paymentData) {
    try {
      const { startDate, expiryDate } = resolveRenewalDates(planData, paymentData);

      if (!expiryDate) {
        throw new Error('Could not calculate subscription expiry date.');
      }

      // 1. Create Subscription
      // The DB trigger 'update_member_from_sub_trigger' will automatically 
      // update members.expiry_date and members.membership_plan.
      const subscription = await subscriptionService.createSubscription(gymId, {
        member_id: memberId,
        plan_name: planData.plan_name,
        duration_type: planData.duration_type || 'custom',
        amount: planData.amount,
        start_date: startDate,
        expiry_date: expiryDate
      });

      // 2. Create Payment (linked to the new subscription)
      if (paymentData && Number(paymentData.amount_paid) > 0) {
        await paymentService.createPayment(gymId, {
          member_id: memberId,
          subscription_id: subscription.id,
          amount_paid: paymentData.amount_paid,
          payment_date: paymentData.payment_date || startDate,
          payment_method: paymentData.payment_method || 'cash',
          payment_status: paymentData.payment_status || 'paid',
          notes: paymentData.notes || `Smart renewal for ${planData.plan_name}`
        });
      }

      // 3. Force Update Member (Safety Sync)
      // Although DB triggers exist, we force a sync here to ensure UI is immediate.
      await updateMember(memberId, {
        expiry_date: expiryDate,
        membership_plan: planData.plan_name,
        status: getStatusFromExpiry(expiryDate)
      });

      // 4. Invalidate stale dashboard stats cache
      invalidateDashboardStatsCache(gymId);

      return { success: true, subscription };
    } catch (error) {
      console.error('Error in smartRenew:', error);
      throw error;
    }
  },

  /**
   * Backfill: When a new member is created, ensure they have a subscription record
   * so that the history and analytics are accurate.
   */
  async recordInitialMemberSetup(gymId, member) {
    if (!member.membership_plan) return;

    try {
      // Create a subscription record to match the member's initial plan
      const subscription = await subscriptionService.createSubscription(gymId, {
        member_id: member.id,
        plan_name: member.membership_plan,
        duration_type: 'custom',
        amount: 0, // We don't know the amount here, but we record the intent
        start_date: member.join_date,
        expiry_date: member.expiry_date
      });

      return subscription;
    } catch (error) {
      console.error('Error recording initial setup:', error);
      // Don't throw, we don't want to break member creation if backfill fails
    }
  }
};
