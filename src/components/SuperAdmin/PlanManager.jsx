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
  MoreVertical,
  Building2,
  Calendar,
  DollarSign,
  Search,
  ArrowRight
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
  const [gymSearch, setGymSearch] = useState('');
  
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
      setPlans(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load SaaS plans', 'error');
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
      showToast('Gym subscription tier updated successfully');
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
    setFeatureInput('');
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
      showToast('Failed to delete plan. It might be linked to active gyms.', 'error');
    } finally {
      setDeletingPlan(false);
    }
  }

  function handleEditPlan(plan) {
    setNewPlan({ 
      name: plan.name || '',
      price: plan.price || 0,
      max_members: plan.max_members || 100,
      features: plan.features || []
    });
    setEditingId(plan.id);
    setShowAddForm(true);
    setOpenMenuId(null);
  }

  function addFeature() {
    if (!featureInput.trim()) return;
    setNewPlan({ ...newPlan, features: [...newPlan.features, featureInput.trim()] });
    setFeatureInput('');
  }

  const filteredGyms = gymsData.filter(gym => {
    if (!gymSearch) return true;
    const name = gym.gym_name?.toLowerCase() || '';
    const plan = gym.saas_plans?.name?.toLowerCase() || '';
    return name.includes(gymSearch.toLowerCase()) || plan.includes(gymSearch.toLowerCase());
  });

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (!gymSearch) return true;
    const gymName = sub.gyms?.gym_name?.toLowerCase() || '';
    const planName = sub.saas_plans?.name?.toLowerCase() || '';
    return gymName.includes(gymSearch.toLowerCase()) || planName.includes(gymSearch.toLowerCase());
  });

  if (loading && plans.length === 0) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Loading SaaS plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Monetization Engine</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">SaaS Subscription Tiers</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Control pricing models, member thresholds, and platform features.</p>
        </div>
        <button 
          onClick={() => showAddForm ? handleCancelForm() : setShowAddForm(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? 'Cancel Form' : 'Create New Tier'}</span>
        </button>
      </div>

      {/* Add / Edit Tier Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 transition-all animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Subscription Tier' : 'Configure New Tier'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Set pricing, maximum member limit, and feature permissions.</p>
            </div>
            <button 
              type="button" 
              onClick={handleCancelForm}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitPlan} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Tier Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  placeholder="e.g. Enterprise Pro"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Price (₹ / Month) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newPlan.price}
                      onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Max Members <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newPlan.max_members}
                    onChange={(e) => setNewPlan({ ...newPlan, max_members: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Included Features
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    placeholder="e.g. Multi-device sync, SMS alerts..."
                  />
                  <button 
                    type="button"
                    onClick={addFeature}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Feature Chips */}
                <div className="flex flex-wrap gap-2 mt-3 max-h-28 overflow-y-auto pt-1">
                  {newPlan.features?.map((feat, i) => (
                    <span 
                      key={i} 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 rounded-lg text-xs font-medium"
                    >
                      {feat}
                      <button 
                        type="button"
                        onClick={() => setNewPlan({ ...newPlan, features: newPlan.features.filter((_, idx) => idx !== i) })}
                        className="hover:text-rose-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(!newPlan.features || newPlan.features.length === 0) && (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 italic">No features added yet.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  {editingId ? 'Update Tier' : 'Publish New Tier'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Plans Display Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isEnterprise = plan.name?.toLowerCase().includes('enterprise') || plan.name?.toLowerCase().includes('gold');
          const isPro = plan.name?.toLowerCase().includes('pro') || plan.name?.toLowerCase().includes('platinum');
          
          return (
            <div 
              key={plan.id} 
              className={`relative group bg-white dark:bg-zinc-900 border rounded-2xl p-6 sm:p-7 transition-all duration-200 flex flex-col justify-between ${
                isEnterprise 
                  ? 'border-amber-400/40 dark:border-amber-500/30' 
                  : isPro 
                  ? 'border-blue-400/40 dark:border-blue-500/30' 
                  : 'border-slate-200 dark:border-zinc-800'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isEnterprise 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                        : isPro 
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isEnterprise ? <Crown className="w-5 h-5" /> : isPro ? <Star className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{plan.name}</h4>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        Platform Tier
                      </span>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <div className="relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === plan.id ? null : plan.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {openMenuId === plan.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl z-30 py-1 text-xs animate-in zoom-in-95 duration-150">
                          <button 
                            onClick={() => handleEditPlan(plan)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5 text-slate-400" />
                            Edit Plan
                          </button>
                          <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />
                          <button 
                            onClick={() => {
                              handleDeletePlanClick(plan.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            Delete Plan
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5 pb-5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">₹{plan.price?.toLocaleString()}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">/ month</span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Billed monthly per gym facility</p>
                </div>

                {/* Capacity & Features */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2.5 text-slate-800 dark:text-zinc-200 font-medium text-xs">
                    <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span>Capacity: <strong className="text-slate-900 dark:text-white font-bold">{plan.max_members?.toLocaleString() || 'Unlimited'}</strong> members</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {plan.features && plan.features.length > 0 ? (
                      plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feature}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-zinc-500 italic">Standard SaaS gym management features included.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live in Production
                </span>
                <button 
                  onClick={() => handleEditPlan(plan)}
                  className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
                >
                  Configure
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gym Subscriptions & Billing Table Container */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {showBillingHistory ? 'SaaS Billing & Invoices' : 'Active Gym Subscriptions'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {showBillingHistory ? 'Real-time ledger of SaaS fee collections and Razorpay transactions.' : 'Manage assigned pricing tiers and gym license statuses.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={gymSearch}
                onChange={(e) => setGymSearch(e.target.value)}
                placeholder="Search gyms..."
                className="pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button 
              onClick={() => setShowBillingHistory(!showBillingHistory)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors shrink-0"
            >
              {showBillingHistory ? 'Show Gyms' : 'View Billing History'}
            </button>
          </div>
        </div>

        {/* Content: Gym Subscriptions View */}
        {!showBillingHistory ? (
          <div>
            {loadingSubscriptions ? (
              <div className="py-16 text-center text-slate-500 dark:text-zinc-400 text-sm">
                <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                Loading gym directory...
              </div>
            ) : filteredGyms.length === 0 ? (
              <div className="py-16 text-center text-slate-500 dark:text-zinc-400 text-sm">
                No gyms match the criteria.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                        <th className="py-3.5 px-6">Gym Entity</th>
                        <th className="py-3.5 px-6">Current Tier</th>
                        <th className="py-3.5 px-6">Status</th>
                        <th className="py-3.5 px-6">Assign Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                      {filteredGyms.map((gym) => (
                        <tr key={gym.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 font-bold text-sm">
                                {gym.gym_name?.charAt(0) || 'G'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white text-sm">{gym.gym_name || 'Unnamed Gym'}</p>
                                <p className="text-[11px] text-slate-400 dark:text-zinc-500">ID: {gym.id?.substring(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/50">
                              {gym.saas_plans?.name || 'No Plan Assigned'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              gym.status === 'active' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                                : gym.status === 'blocked' 
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50' 
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                gym.status === 'active' ? 'bg-emerald-500' : gym.status === 'blocked' ? 'bg-rose-500' : 'bg-amber-500'
                              }`} />
                              {gym.status ? (gym.status.charAt(0).toUpperCase() + gym.status.slice(1)) : 'Pending'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <select 
                              value={gym.saas_plan_id || ''}
                              onChange={(e) => handleUpdateGymPlan(gym.id, e.target.value)}
                              className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="">None (Freemium)</option>
                              {plans.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
                  {filteredGyms.map((gym) => (
                    <div key={gym.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300">
                            {gym.gym_name?.charAt(0) || 'G'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{gym.gym_name || 'Unnamed Gym'}</p>
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500">ID: {gym.id?.substring(0, 8)}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          gym.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {gym.status || 'Active'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-slate-500 dark:text-zinc-400">Assigned Tier:</span>
                        <select 
                          value={gym.saas_plan_id || ''}
                          onChange={(e) => handleUpdateGymPlan(gym.id, e.target.value)}
                          className="flex-1 max-w-[180px] px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-800 dark:text-zinc-200"
                        >
                          <option value="">None (Freemium)</option>
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Content: Billing History View */
          <div>
            {loadingSubscriptions ? (
              <div className="py-16 text-center text-slate-500 dark:text-zinc-400 text-sm">
                <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                Loading billing history...
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <div className="py-16 text-center text-slate-500 dark:text-zinc-400 text-sm">
                No billing history records found.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                        <th className="py-3.5 px-6">Gym Client</th>
                        <th className="py-3.5 px-6">Subscribed Plan</th>
                        <th className="py-3.5 px-6">State</th>
                        <th className="py-3.5 px-6">Billing Period</th>
                        <th className="py-3.5 px-6">Transaction Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                      {filteredSubscriptions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                            {sub.gyms?.gym_name || 'Unknown Gym'}
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">
                              {sub.saas_plans?.name || 'Custom Plan'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              sub.status === 'active' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                                : sub.status === 'past_due' 
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' 
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sub.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {sub.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 dark:text-zinc-400">
                            <div className="flex flex-col text-xs">
                              <span>From: {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : 'N/A'}</span>
                              <span>To: {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {sub.razorpay_order_id ? (
                              <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                {sub.razorpay_payment_id || sub.razorpay_order_id}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                                PROMO / SPONSORED
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
                  {filteredSubscriptions.map((sub) => (
                    <div key={sub.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">{sub.gyms?.gym_name || 'Gym'}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">
                          {sub.saas_plans?.name || 'Plan'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                        <span>Period:</span>
                        <span>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="text-right">
                        {sub.razorpay_order_id ? (
                          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                            {sub.razorpay_payment_id || sub.razorpay_order_id}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            FREE / PROMO
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deletePlanId}
        title="Delete Subscription Tier"
        message="Are you sure you want to delete this plan? Gym facilities currently assigned to this tier might lose access."
        confirmLabel="Delete Tier"
        loading={deletingPlan}
        onConfirm={executeDeletePlan}
        onCancel={() => setDeletePlanId(null)}
      />
    </div>
  );
}
