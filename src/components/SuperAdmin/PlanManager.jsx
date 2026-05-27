import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Check, 
  X, 
  Crown, 
  Shield, 
  Star,
  Users,
  CheckCircle2,
  Settings,
  MoreVertical
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';
import ConfirmModal from '../UI/ConfirmModal';

export default function PlanManager() {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [gymsData, setGymsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: 0,
    max_members: 100,
    features: []
  });
  const [featureInput, setFeatureInput] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [deletePlanId, setDeletePlanId] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    fetchPlans();
    fetchSubscriptions();
  }, []);

  async function fetchPlans() {
    try {
      setLoading(true);
      const data = await superAdminService.getSaaSPlans();
      setPlans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubscriptions() {
    try {
      setLoadingSubscriptions(true);
      const subData = await superAdminService.getAllSaaSSubscriptions();
      setSubscriptions(subData || []);
      const gymData = await superAdminService.getAllGyms();
      setGymsData(gymData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubscriptions(false);
    }
  }

  async function handleUpdateGymPlan(gymId, planId) {
    try {
      await superAdminService.updateGymSaaSPlan(gymId, planId ? planId : null);
      showToast('Gym plan updated successfully');
      fetchSubscriptions();
    } catch (err) {
      showToast('Failed to update gym plan', 'error');
    }
  }

  async function handleSubmitPlan(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await superAdminService.updateSaaSPlan(editingId, newPlan);
        showToast('SaaS plan updated successfully');
      } else {
        await superAdminService.createSaaSPlan(newPlan);
        showToast('New SaaS plan created successfully');
      }
      handleCancelForm();
      fetchPlans();
    } catch (err) {
      showToast(editingId ? 'Failed to update plan' : 'Failed to create plan', 'error');
    }
  }

  function handleCancelForm() {
    setShowAddForm(false);
    setEditingId(null);
    setNewPlan({ name: '', price: 0, max_members: 100, features: [] });
  }

  function handleDeletePlanClick(id) {
    setDeletePlanId(id);
  }

  async function executeDeletePlan() {
    if (!deletePlanId) return;
    setDeletingPlan(true);
    try {
      await superAdminService.deleteSaaSPlan(deletePlanId);
      showToast('Plan deleted successfully');
      fetchPlans();
      setDeletePlanId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete plan. It might be in use.', 'error');
    } finally {
      setDeletingPlan(false);
    }
  }

  function handleEditPlan(plan) {
    setNewPlan({ ...plan });
    setEditingId(plan.id);
    setShowAddForm(true);
    setOpenMenuId(null);
  }

  function addFeature() {
    if (!featureInput.trim()) return;
    setNewPlan({ ...newPlan, features: [...newPlan.features, featureInput.trim()] });
    setFeatureInput('');
  }

  if (loading && plans.length === 0) {
    return <div className="py-20 text-center text-gray-500 font-medium">Loading SaaS Plans...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg tracking-tight">SaaS Subscription Tiers</h3>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Control monetization and feature access</p>
        </div>
        <button 
          onClick={() => showAddForm ? handleCancelForm() : setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#3390ec] hover:bg-[#2b83d6] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#3390ec]/20 active:scale-95"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? 'Cancel' : 'Create New Tier'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-[#212121] border border-[#3390ec]/30 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-top-4">
          <form onSubmit={handleSubmitPlan} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest px-1">Tier Name</label>
                <input
                  type="text"
                  required
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#1c1c1c] border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-[#3390ec]/50"
                  placeholder="e.g. Platinum"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest px-1">Price (₹ / Month)</label>
                  <input
                    type="number"
                    required
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-[#1c1c1c] border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-[#3390ec]/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest px-1">Max Members</label>
                  <input
                    type="number"
                    required
                    value={newPlan.max_members}
                    onChange={(e) => setNewPlan({ ...newPlan, max_members: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-[#1c1c1c] border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-[#3390ec]/50"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest px-1">Features</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    className="flex-1 px-4 py-2.5 bg-[#1c1c1c] border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-[#3390ec]/50"
                    placeholder="Add a feature..."
                  />
                  <button 
                    type="button"
                    onClick={addFeature}
                    className="px-4 py-2.5 bg-white/5 text-white rounded-xl hover:bg-white/10"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newPlan.features.map((f, i) => (
                    <span key={i} className="px-2 py-1 bg-[#3390ec]/10 text-[#3390ec] text-[10px] font-bold rounded-lg flex items-center gap-1">
                      {f}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setNewPlan({ ...newPlan, features: newPlan.features.filter((_, idx) => idx !== i) })} />
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#3390ec] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                {editingId ? 'Update Membership Tier' : 'Save Membership Tier'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plans Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="relative group bg-[#212121] border border-white/5 rounded-3xl p-8 hover:border-[#3390ec]/30 transition-all shadow-xl overflow-hidden">
            {/* Background Icon */}
            <div className="absolute -right-4 -top-4 text-white/[0.02] transform rotate-12 group-hover:scale-110 transition-transform">
              <CreditCard className="w-40 h-40" />
            </div>

            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${
                  plan.name === 'Enterprise' ? 'bg-amber-400/10 text-amber-400' :
                  plan.name === 'Professional' ? 'bg-[#3390ec]/10 text-[#3390ec]' :
                  'bg-emerald-400/10 text-emerald-400'
                }`}>
                  {plan.name === 'Enterprise' ? <Crown className="w-6 h-6" /> :
                   plan.name === 'Professional' ? <Star className="w-6 h-6" /> :
                   <Shield className="w-6 h-6" />}
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === plan.id ? null : plan.id)}
                    className="p-2 rounded-xl hover:bg-white/5 text-gray-700 hover:text-white transition-all"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {openMenuId === plan.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl z-20 py-2 animate-in zoom-in-95 duration-200">
                        <button 
                          onClick={() => handleEditPlan(plan)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <Settings className="w-4 h-4" />
                          Edit Plan
                        </button>
                        
                        <div className="h-px bg-white/5 my-1" />

                        <button 
                          onClick={() => {
                            handleDeletePlanClick(plan.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all"
                        >
                          <X className="w-4 h-4" />
                          Delete Plan
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-white font-black text-2xl tracking-tight uppercase italic">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-[#3390ec]">₹{plan.price}</span>
                  <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">/ Month</span>
                </div>
              </div>

              <div className="space-y-3 py-6 border-y border-white/5">
                <div className="flex items-center gap-3 text-white">
                  <Users className="w-4 h-4 text-[#3390ec]" />
                  <span className="text-sm font-bold">Up to {plan.max_members.toLocaleString()} Members</span>
                </div>
                {plan.features?.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-[11px] font-medium leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Platform Tier</span>
                <span className="bg-white/5 text-gray-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                  Active
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assigned Plans Overview */}
      <div className="bg-[#212121] border border-white/5 rounded-2xl p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg tracking-tight">Active Gym Subscriptions</h3>
          <button 
            onClick={() => setShowBillingHistory(!showBillingHistory)}
            className="text-[#3390ec] text-xs font-black uppercase tracking-widest hover:underline transition-all"
          >
            {showBillingHistory ? 'Hide Billing History' : 'View Billing History'}
          </button>
        </div>
        
        {!showBillingHistory ? (
          <div className="space-y-4 animate-in slide-in-from-top-4">
            {loadingSubscriptions ? (
              <div className="py-8 text-center text-gray-500 font-medium">Loading Gyms...</div>
            ) : gymsData.length === 0 ? (
              <div className="py-8 text-center text-gray-500 font-medium">No gyms found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 text-[10px] uppercase tracking-widest font-black">
                      <th className="py-3 px-4">Gym Name</th>
                      <th className="py-3 px-4">Current Plan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Change Plan</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-300">
                    {gymsData.map((gym) => (
                      <tr key={gym.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4 font-bold text-white">
                          {gym.gym_name || 'Unknown Gym'}
                        </td>
                        <td className="py-4 px-4">
                          <span className="bg-[#3390ec]/10 text-[#3390ec] text-[10px] font-bold px-2 py-1 rounded-lg">
                            {gym.saas_plans?.name || 'No Plan'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
                            gym.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                            gym.status === 'blocked' ? 'bg-rose-500/10 text-rose-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {gym.status || 'Pending'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <select 
                            value={gym.saas_plan_id || ''}
                            onChange={(e) => handleUpdateGymPlan(gym.id, e.target.value)}
                            className="bg-[#1c1c1c] border border-white/10 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#3390ec]"
                          >
                            <option value="">No Plan</option>
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-top-4">
            {loadingSubscriptions ? (
              <div className="py-8 text-center text-gray-500 font-medium">Loading Billing History...</div>
            ) : subscriptions.length === 0 ? (
              <div className="py-8 text-center text-gray-500 font-medium">No billing history found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 text-[10px] uppercase tracking-widest font-black">
                      <th className="py-3 px-4">Gym Name</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Payment Info</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-300">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4 font-bold text-white">
                          {sub.gyms?.gym_name || 'Unknown Gym'}
                        </td>
                        <td className="py-4 px-4">
                          <span className="bg-[#3390ec]/10 text-[#3390ec] text-[10px] font-bold px-2 py-1 rounded-lg">
                            {sub.saas_plans?.name || 'Unknown Plan'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
                            sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                            sub.status === 'past_due' ? 'bg-rose-500/10 text-rose-500' :
                            sub.status === 'canceled' ? 'bg-gray-500/10 text-gray-400' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {sub.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs">Start: {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : 'N/A'}</span>
                            <span className="text-xs">End: {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {sub.razorpay_order_id ? (
                            <span className="text-[10px] font-medium text-gray-400 font-mono">
                              {sub.razorpay_payment_id || sub.razorpay_order_id}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                              FREE / PROMO
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deletePlanId}
        title="Delete Plan"
        message="Are you sure you want to delete this plan? Gyms using this plan might be affected."
        confirmLabel="Delete"
        loading={deletingPlan}
        onConfirm={executeDeletePlan}
        onCancel={() => setDeletePlanId(null)}
      />
    </div>
  );
}
