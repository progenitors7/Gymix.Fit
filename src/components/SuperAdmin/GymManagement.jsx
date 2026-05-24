import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldCheck, 
  ShieldAlert, 
  Ban, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Building2,
  Calendar,
  Sparkles,
  Phone,
  Trash2,
  Clock
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';

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

  function getDaysAgo(dateString) {
    if (!dateString) return 'Never';
    const diffTime = Math.abs(new Date() - new Date(dateString));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
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
    if (!confirm('Are you sure you want to permanently delete this athlete? All attendance logs and profiles will be erased. This cannot be undone.')) return;
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

  async function handleStatusChange(gymId, newStatus) {
    try {
      setUpdatingId(gymId);
      await superAdminService.updateGymStatus(gymId, newStatus);
      setGyms(prev => prev.map(g => g.id === gymId ? { ...g, status: newStatus } : g));
      showToast(`Gym status updated to ${newStatus}`);
    } catch (err) {
      showToast('Failed to update gym status', 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleActivateSubmit() {
    try {
      setUpdatingId(activationModal.gymId);
      if (selectedPlan) {
        await superAdminService.updateGymSaaSPlan(activationModal.gymId, selectedPlan);
      }
      await superAdminService.updateGymStatus(activationModal.gymId, 'active');
      const selectedPlanData = saasPlans.find(p => p.id === selectedPlan);
      
      setGyms(prev => prev.map(g => g.id === activationModal.gymId ? { 
        ...g, 
        status: 'active',
        saas_plans: selectedPlanData || g.saas_plans
      } : g));
      
      showToast('Gym account activated and plan assigned!');
      setActivationModal({ isOpen: false, gymId: null, gymName: '' });
    } catch (err) {
      showToast('Failed to activate gym', 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  // Filter lists
  const filteredGyms = gyms.filter(g => {
    const name = g.gym_name || '';
    const id = g.id || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                          id.toLowerCase().includes(search.toLowerCase());
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
      <div className="flex rounded-2xl bg-white/[0.02] border border-white/5 p-1.5 max-w-md shadow-lg glass-card">
        <button
          onClick={() => setActiveSubTab('owners')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeSubTab === 'owners'
              ? 'bg-[#3390ec] text-white shadow-lg shadow-[#3390ec]/20'
              : 'text-slate-500 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Gym Owners
          <span className="text-[10px] bg-black/30 text-white/70 px-2 py-0.5 rounded-full ml-1">
            {gyms.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeSubTab === 'members'
              ? 'bg-[#3390ec] text-white shadow-lg shadow-[#3390ec]/20'
              : 'text-slate-500 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Athletes / Members
          <span className="text-[10px] bg-black/30 text-white/70 px-2 py-0.5 rounded-full ml-1">
            {members.length}
          </span>
        </button>
      </div>

      {/* OWNERS TAB VIEW */}
      {activeSubTab === 'owners' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by Gym Name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#1c1c1c] border border-white/5 rounded-xl text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-[#3390ec]/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#212121] border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-400 hover:text-white transition-all focus:outline-none focus:border-[#3390ec]/50"
              >
                <option value="all">All SaaS Status</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Owners Table */}
          <div className="bg-[#212121] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1c1c1c]/50 border-b border-white/5">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Gym Identity</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Registry Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">SaaS Tier Plan</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Gateway Code</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredGyms.map((gym) => (
                    <tr key={gym.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#3390ec] font-black text-sm border border-white/5 shadow-inner">
                            {gym.gym_name ? gym.gym_name.charAt(0).toUpperCase() : 'G'}
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm tracking-tight">{gym.gym_name || 'No Name Gym'}</p>
                            <p className="text-gray-500 text-[10px] font-bold font-mono uppercase tracking-wider">{gym.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs font-bold">
                        {new Date(gym.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-[#3390ec]/10 border border-[#3390ec]/20 text-[#3390ec] text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          {gym.saas_plans?.name || 'Starter Plan'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-emerald-400 text-xs font-black tracking-widest">
                        {gym.unique_code || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          gym.status === 'active' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-500/20' : 
                          gym.status === 'blocked' ? 'bg-red-400/10 text-red-400 border border-red-500/20' : 
                          'bg-amber-400/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            gym.status === 'active' ? 'bg-emerald-400' : 
                            gym.status === 'blocked' ? 'bg-red-400' : 
                            'bg-amber-400'
                          }`} />
                          {gym.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative">
                            <button 
                              onClick={() => setOpenMenuId(openMenuId === gym.id ? null : gym.id)}
                              className={`p-2 rounded-lg transition-all ${
                                openMenuId === gym.id ? 'bg-[#3390ec] text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                              }`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === gym.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 mt-2 w-48 bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl z-20 py-2 animate-in zoom-in-95 duration-200">
                                  {gym.status !== 'active' ? (
                                    <button 
                                      onClick={() => {
                                        setActivationModal({ isOpen: true, gymId: gym.id, gymName: gym.gym_name });
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-400/10 transition-all text-left"
                                    >
                                      <ShieldCheck className="w-4 h-4" />
                                      Activate Account
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => {
                                        handleStatusChange(gym.id, 'blocked');
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-400/10 transition-all text-left"
                                    >
                                      <Ban className="w-4 h-4" />
                                      Block Owner
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to PERMANENTLY delete ${gym.gym_name} along with its owner profile? All linked members, check-ins, and logs will be lost forever.`)) {
                                        handleDeleteGym(gym.id);
                                      }
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-all text-left"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
                  <AlertCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No gyms found matching your query.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS/ATHLETES TAB VIEW */}
      {activeSubTab === 'members' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search Athlete by Name, Phone, Email, Gym..."
                value={membersSearch}
                onChange={(e) => setMembersSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#1c1c1c] border border-white/5 rounded-xl text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-[#3390ec]/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={membersStatusFilter}
                onChange={(e) => setMembersStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#212121] border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-400 hover:text-white transition-all focus:outline-none focus:border-[#3390ec]/50"
              >
                <option value="all">All Pass Status</option>
                <option value="active">Active Pass</option>
                <option value="expired">Expired Pass</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="trial">Free Trial</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-[#212121] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              {membersLoading && members.length === 0 ? (
                <div className="py-20 text-center text-gray-500 font-medium">Loading Athlete Directory...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1c1c1c]/50 border-b border-white/5">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Athlete Details</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Connected Gym</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Join & Expiry</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Workouts</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#3390ec]/5 flex items-center justify-center text-[#3390ec] font-black text-sm border border-[#3390ec]/20 shadow-inner">
                              {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'M'}
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm tracking-tight">{member.full_name || 'No Name Athlete'}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-gray-500 text-[10px] font-bold">
                                {member.phone_number && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="w-2.5 h-2.5" />
                                    {member.phone_number}
                                  </span>
                                )}
                                <span>•</span>
                                <span className="uppercase">{member.gender || 'unspecified'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {member.gyms ? (
                            <div>
                              <p className="text-white font-bold text-xs flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-[#3390ec]" />
                                {member.gyms.gym_name}
                              </p>
                              <p className="text-emerald-400 font-mono text-[9px] font-black tracking-widest mt-0.5 uppercase bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded inline-block">
                                Code: {member.gyms.unique_code}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">Not connected</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 text-[11px] font-bold">
                            <p className="text-gray-400">Join: {member.join_date ? new Date(member.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</p>
                            <p className="text-rose-400/80">Expr: {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 bg-white/5 text-white text-xs font-black px-2.5 py-1 rounded-lg border border-white/5">
                            <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                            {member.check_in_count || 0} Check-ins
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
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
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            disabled={updatingId === member.id}
                            className="p-2.5 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer border border-rose-500/10 inline-flex"
                            title="Delete Athlete Record & Profile"
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
                  <AlertCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No athletes found matching your query.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activation Modal */}
      {activationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative zoom-in-95 animate-in duration-200">
            <button 
              onClick={() => setActivationModal({ isOpen: false, gymId: null, gymName: '' })}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2">Activate Gym Account</h3>
            <p className="text-gray-400 text-sm mb-6">Select a SaaS plan to assign to <span className="text-white font-bold">{activationModal.gymName}</span>.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">SaaS Plan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full bg-[#212121] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3390ec]/50 transition-all"
                >
                  <option value="">No Plan / Starter</option>
                  {saasPlans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name} - ₹{plan.price}/mo</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleActivateSubmit}
                disabled={updatingId === activationModal.gymId}
                className="w-full bg-[#3390ec] hover:bg-[#3390ec]/90 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {updatingId === activationModal.gymId ? 'Activating...' : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
