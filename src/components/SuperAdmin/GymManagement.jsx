import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldCheck, 
  ShieldAlert, 
  Ban, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Users, 
  Building2, 
  Calendar, 
  Sparkles, 
  Phone, 
  Trash2, 
  Clock,
  Mail,
  User,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';
import ConfirmModal from '../UI/ConfirmModal';

export default function GymManagement() {
  // Navigation: 'owners' | 'members'
  const [activeSubTab, setActiveSubTab] = useState('owners');

  // Owners State
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Members State
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersSearch, setMembersSearch] = useState('');
  const [membersStatusFilter, setMembersStatusFilter] = useState('all');

  // Shared Action States
  const [updatingId, setUpdatingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [saasPlans, setSaasPlans] = useState([]);
  const [activationModal, setActivationModal] = useState({ isOpen: false, gymId: null, gymName: '' });
  const [selectedPlan, setSelectedPlan] = useState('');
  const [activationDays, setActivationDays] = useState(30);
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

  const triggerConfirm = (title, message, confirmLabel, onConfirm) => {
    setConfirmState({ isOpen: true, title, message, confirmLabel, onConfirm });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchGyms();
    fetchPlans();
    fetchMembers();
  }, []);

  async function fetchPlans() {
    try {
      const plans = await superAdminService.getSaaSPlans();
      setSaasPlans(plans);
      if (plans.length > 0) setSelectedPlan(plans[0].id);
    } catch (err) {
      console.error('[GymManagement] Error fetching SaaS plans:', err);
    }
  }

  async function fetchGyms() {
    try {
      setLoading(true);
      const data = await superAdminService.getAllGyms();
      setGyms(data || []);
    } catch (err) {
      console.error('[GymManagement] Error fetching gyms:', err);
      showToast('Failed to load gym directory', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembers() {
    try {
      setMembersLoading(true);
      const data = await superAdminService.getAllMembers();
      setMembers(data || []);
    } catch (err) {
      console.error('[GymManagement] Error fetching members:', err);
      showToast('Failed to load member directory', 'error');
    } finally {
      setMembersLoading(false);
    }
  }

  async function handleDeleteGym(gymId) {
    try {
      setUpdatingId(gymId);
      await superAdminService.deleteGym(gymId);
      setGyms(prev => prev.filter(g => g.id !== gymId));
      showToast('Gym owner and profile deleted permanently');
      // Refresh members list as well due to cascade deletion
      fetchMembers();
    } catch (err) {
      showToast('Failed to delete gym owner', 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteMember(memberId) {
    triggerConfirm(
      'Delete Athlete',
      'Are you sure you want to permanently delete this athlete? All attendance logs and profiles will be erased. This cannot be undone.',
      'Delete',
      async () => {
        try {
          setUpdatingId(memberId);
          await superAdminService.deleteMember(memberId);
          setMembers(prev => prev.filter(m => m.id !== memberId));
          showToast('Athlete record and profile permanently deleted');
        } catch (err) {
          showToast('Failed to delete athlete', 'error');
        } finally {
          setUpdatingId(null);
        }
      }
    );
  }

  async function handleStatusChange(gymId, newStatus) {
    try {
      setUpdatingId(gymId);
      await superAdminService.updateGymStatus(gymId, newStatus);
      setGyms(prev => prev.map(g => g.id === gymId ? { ...g, status: newStatus } : g));
      showToast(`Gym status updated to ${newStatus}`);
      if (newStatus === 'blocked') {
        // Refresh directory details
        fetchGyms();
        fetchMembers();
      }
    } catch (err) {
      showToast('Failed to update gym status', 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleActivateSubmit() {
    try {
      setUpdatingId(activationModal.gymId);
      const days = parseInt(activationDays, 10) || 30;
      await superAdminService.activateGym(activationModal.gymId, selectedPlan, days);
      const selectedPlanData = saasPlans.find(p => p.id === selectedPlan);
      
      setGyms(prev => prev.map(g => g.id === activationModal.gymId ? { 
        ...g, 
        status: 'active',
        saas_plans: selectedPlanData || g.saas_plans
      } : g));
      
      showToast(`Gym account activated for ${days} days!`);
      setActivationModal({ isOpen: false, gymId: null, gymName: '' });
      fetchGyms();
    } catch (err) {
      console.error('[GymManagement] Activation failed:', err);
      showToast('Failed to activate gym: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  // Filter lists
  const filteredGyms = gyms.filter(g => {
    const gymName = g.gym_name || '';
    const id = g.id || '';
    const ownerName = g.owner_profile?.full_name || '';
    const ownerEmail = g.owner_profile?.email || '';
    const matchesSearch = gymName.toLowerCase().includes(search.toLowerCase()) || 
                          id.toLowerCase().includes(search.toLowerCase()) ||
                          ownerName.toLowerCase().includes(search.toLowerCase()) ||
                          ownerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredMembers = members.filter(m => {
    const name = m.full_name || '';
    const phone = m.phone_number || '';
    const email = m.profiles?.email || '';
    const gymName = m.gyms?.gym_name || '';
    const matchesSearch = name.toLowerCase().includes(membersSearch.toLowerCase()) || 
                          phone.toLowerCase().includes(membersSearch.toLowerCase()) || 
                          email.toLowerCase().includes(membersSearch.toLowerCase()) || 
                          gymName.toLowerCase().includes(membersSearch.toLowerCase());
    const matchesStatus = membersStatusFilter === 'all' || m.status === membersStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />

      {/* Directory Selector Toggle */}
      <div className="flex rounded-3xl bg-slate-950/40 backdrop-blur-md border border-white/5 p-1.5 max-w-lg shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-[#3390ec]/5 to-transparent pointer-events-none opacity-40" />
        <button
          onClick={() => setActiveSubTab('owners')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-4.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeSubTab === 'owners'
              ? 'bg-gradient-to-r from-[#3390ec] to-[#2563eb] text-white shadow-xl shadow-[#3390ec]/20 hover:brightness-110 active:scale-95'
              : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Gym Owners
          <span className="text-[10px] bg-black/40 text-white/90 font-black px-2.5 py-0.5 rounded-full border border-white/5 ml-1">
            {gyms.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-4.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeSubTab === 'members'
              ? 'bg-gradient-to-r from-[#3390ec] to-[#2563eb] text-white shadow-xl shadow-[#3390ec]/20 hover:brightness-110 active:scale-95'
              : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <Users className="w-4 h-4" />
          Athletes / Members
          <span className="text-[10px] bg-black/40 text-white/90 font-black px-2.5 py-0.5 rounded-full border border-white/5 ml-1">
            {members.length}
          </span>
        </button>
      </div>

      {/* OWNERS TAB VIEW */}
      {activeSubTab === 'owners' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Quick Status Filter Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <button
              onClick={() => setStatusFilter('all')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#3390ec]/15 border-[#3390ec]/50 text-white shadow-lg shadow-[#3390ec]/10'
                  : 'bg-[#14151b]/40 border-white/5 text-slate-400 hover:bg-white/[0.03] hover:text-white'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">All Gyms</p>
              <p className="text-xl font-black text-white mt-1">{gyms.length}</p>
            </button>
            
            <button
              onClick={() => setStatusFilter('active')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-[#14151b]/40 border-white/5 text-slate-400 hover:bg-white/[0.03] hover:text-white'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Active Plans</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{gyms.filter(g => g.status === 'active').length}</p>
            </button>

            <button
              onClick={() => setStatusFilter('expired')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                statusFilter === 'expired'
                  ? 'bg-rose-500/15 border-rose-500/50 text-white shadow-lg shadow-rose-500/10'
                  : 'bg-[#14151b]/40 border-white/5 text-slate-400 hover:bg-white/[0.03] hover:text-white'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Expired Plans</p>
              <p className="text-xl font-black text-rose-400 mt-1">{gyms.filter(g => g.status === 'expired').length}</p>
            </button>

            <button
              onClick={() => setStatusFilter('pending')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-lg shadow-amber-500/10'
                  : 'bg-[#14151b]/40 border-white/5 text-slate-400 hover:bg-white/[0.03] hover:text-white'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Pending</p>
              <p className="text-xl font-black text-amber-400 mt-1">{gyms.filter(g => g.status === 'pending').length}</p>
            </button>

            <button
              onClick={() => setStatusFilter('blocked')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                statusFilter === 'blocked'
                  ? 'bg-red-500/15 border-red-500/50 text-white shadow-lg shadow-red-500/10'
                  : 'bg-[#14151b]/40 border-white/5 text-slate-400 hover:bg-white/[0.03] hover:text-white'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Blocked</p>
              <p className="text-xl font-black text-red-400 mt-1">{gyms.filter(g => g.status === 'blocked').length}</p>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-[28rem] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#3390ec] transition-colors" />
              <input
                type="text"
                placeholder="Search by Gym Name, ID, Owner Name or Email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-[#14151b] border border-white/5 rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-[#3390ec]/60 focus:ring-1 focus:ring-[#3390ec]/30 shadow-inner transition-all duration-300"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-[#14151b] border border-white/5 rounded-2xl pl-5 pr-10 py-4 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-all focus:outline-none focus:border-[#3390ec]/60 cursor-pointer"
              >
                <option value="all">All SaaS Status</option>
                <option value="active">Active Plan</option>
                <option value="expired">Expired Plan</option>
                <option value="pending">Pending</option>
                <option value="blocked">Blocked</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Owners Table */}
          <div className="bg-[#14151b]/40 backdrop-blur-md border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0b0c10]/80 border-b border-white/5">
                    <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gym & Owner Details</th>
                    <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry Date</th>
                    <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">SaaS Tier Plan</th>
                    <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Expiry & Time Left</th>
                    <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gateway Code</th>
                    <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredGyms.map((gym) => (
                    <tr key={gym.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-7 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center text-[#3390ec] font-black text-base border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                            {gym.owner_profile?.avatar_url ? (
                              <img src={gym.owner_profile.avatar_url} alt="Owner" className="w-full h-full object-cover" />
                            ) : (
                              gym.gym_name ? gym.gym_name.charAt(0).toUpperCase() : 'G'
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-white font-extrabold text-sm tracking-tight">{gym.gym_name || 'No Name Gym'}</p>
                            
                            {/* Gym Owner details displaying dynamically */}
                            {gym.owner_profile ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                                  <User className="w-3 h-3 text-[#3390ec]" />
                                  <span>{gym.owner_profile.full_name || 'Anonymous Owner'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[9px] font-mono">
                                  <Mail className="w-2.5 h-2.5 text-slate-600" />
                                  <span>{gym.owner_profile.email}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-rose-500/60 text-[10px] font-bold">
                                <ShieldAlert className="w-3 h-3" />
                                <span>No Linked Owner Account</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-7 py-5 text-slate-400 text-xs font-bold font-mono">
                        {new Date(gym.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-7 py-5">
                        <span className="bg-[#3390ec]/10 border border-[#3390ec]/20 text-[#3390ec] text-[10px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-wider">
                          {gym.saas_plans?.name || 'Starter Plan'}
                        </span>
                      </td>
                      <td className="px-7 py-5">
                        {gym.expires_at ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                              <Calendar className="w-3.5 h-3.5 text-[#3390ec]" />
                              <span>{new Date(gym.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div>
                              {gym.days_left > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <Clock className="w-3 h-3" />
                                  {gym.days_left} {gym.days_left === 1 ? 'day' : 'days'} left
                                </span>
                              ) : gym.days_left === 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  <Clock className="w-3 h-3" />
                                  Expires Today
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  <Clock className="w-3 h-3" />
                                  Expired ({Math.abs(gym.days_left)} {Math.abs(gym.days_left) === 1 ? 'day' : 'days'} ago)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs font-bold">—</span>
                        )}
                      </td>
                      <td className="px-7 py-5 font-mono text-emerald-400 text-xs font-black tracking-widest">
                        {gym.unique_code || '—'}
                      </td>
                      <td className="px-7 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          gym.status === 'active' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.05)]' : 
                          gym.status === 'expired' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]' : 
                          gym.status === 'blocked' ? 'bg-red-400/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(248,113,113,0.05)]' : 
                          'bg-amber-400/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.05)]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            gym.status === 'active' ? 'bg-emerald-400' : 
                            gym.status === 'expired' ? 'bg-rose-400' : 
                            gym.status === 'blocked' ? 'bg-red-400' : 
                            'bg-amber-400'
                          }`} />
                          {gym.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-7 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative">
                            <button 
                              onClick={() => setOpenMenuId(openMenuId === gym.id ? null : gym.id)}
                              className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                                openMenuId === gym.id 
                                  ? 'bg-[#3390ec] text-white border-[#3390ec]' 
                                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.08]'
                              }`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === gym.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 mt-2.5 w-52 bg-[#0e0f14] border border-white/10 rounded-2xl shadow-2xl z-20 py-2.5 animate-in zoom-in-95 duration-200">
                                  {gym.status !== 'active' ? (
                                    <button 
                                      onClick={() => {
                                        setActivationModal({ isOpen: true, gymId: gym.id, gymName: gym.gym_name });
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-emerald-400 hover:bg-emerald-400/10 transition-all text-left"
                                    >
                                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                      {gym.status === 'expired' ? 'Renew / Extend Plan' : 'Activate Account'}
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => {
                                        triggerConfirm(
                                          'Block Gym',
                                          `Are you sure you want to block ${gym.gym_name}? This will instantly suspend and delete their active authentication account.`,
                                          'Block',
                                          () => handleStatusChange(gym.id, 'blocked')
                                        );
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-amber-400 hover:bg-amber-400/10 transition-all text-left"
                                    >
                                      <Ban className="w-4 h-4 text-amber-400" />
                                      Block & Delete Auth
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => {
                                      triggerConfirm(
                                        'Delete Gym Account',
                                        `Are you sure you want to PERMANENTLY delete ${gym.gym_name}? This will completely erase all gyms, attendance sheets, payments, AND the owner's authentication profile.`,
                                        'Delete',
                                        () => handleDeleteGym(gym.id)
                                      );
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-all text-left border-t border-white/5"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                    Delete Account
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredGyms.length === 0 && (
                <div className="py-20 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No gyms found matching your query.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS/ATHLETES TAB VIEW */}
      {activeSubTab === 'members' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-[28rem] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#3390ec] transition-colors" />
              <input
                type="text"
                placeholder="Search Athlete by Name, Phone, Email, Gym..."
                value={membersSearch}
                onChange={(e) => setMembersSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-[#14151b] border border-white/5 rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-[#3390ec]/60 focus:ring-1 focus:ring-[#3390ec]/30 shadow-inner transition-all duration-300"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto relative">
              <select 
                value={membersStatusFilter}
                onChange={(e) => setMembersStatusFilter(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-[#14151b] border border-white/5 rounded-2xl pl-5 pr-10 py-4 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-all focus:outline-none focus:border-[#3390ec]/60 cursor-pointer"
              >
                <option value="all">All Pass Status</option>
                <option value="active">Active Pass</option>
                <option value="expired">Expired Pass</option>
                <option value="expiring_soon">Expiring Soon</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-[#14151b]/40 backdrop-blur-md border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
            <div className="overflow-x-auto">
              {membersLoading && members.length === 0 ? (
                <div className="py-20 text-center text-slate-500 font-medium">Loading Athlete Directory...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0b0c10]/80 border-b border-white/5">
                      <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Athlete Details</th>
                      <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Connected Gym</th>
                      <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Join & Expiry</th>
                      <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Workouts</th>
                      <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-7 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="px-7 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3390ec]/5 to-[#3390ec]/20 flex items-center justify-center text-[#3390ec] font-black text-base border border-[#3390ec]/20 shadow-inner group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                              {(member.avatar_url || member.profiles?.avatar_url) ? (
                                <img src={member.avatar_url || member.profiles.avatar_url} alt="Athlete" className="w-full h-full object-cover" />
                              ) : (
                                member.full_name ? member.full_name.charAt(0).toUpperCase() : 'M'
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="text-white font-extrabold text-sm tracking-tight">{member.full_name || 'No Name Athlete'}</p>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                                  <Phone className="w-3 h-3 text-[#3390ec]" />
                                  <span>{member.phone_number || 'No Phone Registered'}</span>
                                </div>
                                {member.profiles?.email && (
                                  <div className="flex items-center gap-1.5 text-slate-500 text-[9px] font-mono">
                                    <Mail className="w-2.5 h-2.5 text-slate-600" />
                                    <span>{member.profiles.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-7 py-5">
                          {member.gyms ? (
                            <div className="space-y-1">
                              <p className="text-white font-bold text-xs flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-[#3390ec]" />
                                {member.gyms.gym_name}
                              </p>
                              <span className="text-emerald-400 font-mono text-[9px] font-black tracking-widest uppercase bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-lg inline-block">
                                Code: {member.gyms.unique_code}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs font-black uppercase tracking-wider">Not connected</span>
                          )}
                        </td>
                        <td className="px-7 py-5">
                          <div className="space-y-1 text-[11px] font-bold">
                            <p className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-600" />
                              <span>Join: {member.join_date ? new Date(member.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
                            </p>
                            <p className="text-rose-400/80 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-rose-500/40" />
                              <span>Expr: {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                            </p>
                          </div>
                        </td>
                        <td className="px-7 py-5">
                          <span className="inline-flex items-center gap-1 bg-white/5 text-white text-[11px] font-black px-3 py-1.5 rounded-xl border border-white/5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                            {member.check_in_count || 0} Check-ins
                          </span>
                        </td>
                        <td className="px-7 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            member.status === 'active' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-500/20' : 
                            member.status === 'expired' ? 'bg-red-400/10 text-red-400 border border-red-500/20' : 
                            'bg-amber-400/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              member.status === 'active' ? 'bg-emerald-400' : 
                              member.status === 'expired' ? 'bg-red-400' : 
                              'bg-amber-400'
                            }`} />
                            {member.status || 'active'}
                          </span>
                        </td>
                        <td className="px-7 py-5 text-right">
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            disabled={updatingId === member.id}
                            className="p-3 bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 hover:border-rose-500/30 text-rose-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer inline-flex shadow-lg shadow-rose-500/5 active:scale-95 disabled:opacity-50"
                            title="Delete Athlete Record & Auth Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {filteredMembers.length === 0 && !membersLoading && (
                <div className="py-20 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No athletes found matching your query.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activation Modal */}
      {activationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121319] border border-white/10 rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative zoom-in-95 animate-in duration-200">
            <button 
              onClick={() => setActivationModal({ isOpen: false, gymId: null, gymName: '' })}
              className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 rounded-2xl mb-6 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">Activate Gym Account</h3>
            <p className="text-slate-400 text-sm mb-6">Select a SaaS subscription tier to assign to <strong className="text-white">"{activationModal.gymName}"</strong>.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">SaaS Plan Tier</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full bg-[#1c1d24] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-[#3390ec]/60 transition-all font-bold cursor-pointer"
                >
                  <option value="">No Plan / Starter</option>
                  {saasPlans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name} - ₹{plan.price}/mo</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Activation Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={activationDays}
                  onChange={(e) => setActivationDays(e.target.value)}
                  placeholder="e.g. 20, 30, 90, 365"
                  className="w-full bg-[#1c1d24] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-[#3390ec]/60 transition-all font-bold text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Specify how many days the gym access remains active (e.g. enter 20 for 20 days).</p>
              </div>

              <button 
                onClick={handleActivateSubmit}
                disabled={updatingId === activationModal.gymId}
                className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/15 active:scale-95 transition-all duration-300 disabled:opacity-50 cursor-pointer mt-2"
              >
                {updatingId === activationModal.gymId ? 'Activating...' : `Activate for ${activationDays || 30} Days`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={async () => {
          await confirmState.onConfirm();
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
