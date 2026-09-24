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
  Tag, 
  Phone, 
  Trash2, 
  Clock,
  Mail,
  User,
  ExternalLink,
  ChevronDown,
  Edit2,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';
import ConfirmModal from '../UI/ConfirmModal';

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemName = 'records'
}) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/80 dark:bg-zinc-950/60 border-t border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400">
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="text-slate-900 dark:text-white font-bold">{startItem}</strong> to <strong className="text-slate-900 dark:text-white font-bold">{endItem}</strong> of <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{totalItems}</strong> {itemName}
        </span>
        <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 dark:border-zinc-800 pl-3">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all font-bold"
        >
          Previous
        </button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => (
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 dark:text-zinc-600 font-black">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-[32px] h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currentPage === p
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black font-black'
                    : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
                }`}
              >
                {p}
              </button>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all font-bold"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function GymManagement({ initialSubTab = 'owners', mode = null }) {
  // Navigation: 'owners' | 'members'
  const [activeSubTab, setActiveSubTab] = useState(mode || initialSubTab);

  useEffect(() => {
    if (mode) setActiveSubTab(mode);
    else if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [mode, initialSubTab]);

  // Owners State & Pagination
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gymsPage, setGymsPage] = useState(1);
  const [gymsPerPage, setGymsPerPage] = useState(10);
  
  // Members State & Pagination
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersSearch, setMembersSearch] = useState('');
  const [membersStatusFilter, setMembersStatusFilter] = useState('all');
  const [membersPage, setMembersPage] = useState(1);
  const [membersPerPage, setMembersPerPage] = useState(15);

  // Shared Action States
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [saasPlans, setSaasPlans] = useState([]);
  const [activationModal, setActivationModal] = useState({ isOpen: false, gymId: null, gymName: '' });
  const [selectedPlan, setSelectedPlan] = useState('');
  const [activationDays, setActivationDays] = useState(30);
  const [exactEndDate, setExactEndDate] = useState('');
  const [useExactDate, setUseExactDate] = useState(false);
  const [editMemberModal, setEditMemberModal] = useState({ isOpen: false, member: null });
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

  const triggerConfirm = (title, message, confirmLabel, onConfirm) => {
    setConfirmState({ isOpen: true, title, message, confirmLabel, onConfirm });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Reset pagination on search or filter change
  useEffect(() => {
    setGymsPage(1);
  }, [search, statusFilter, gymsPerPage]);

  useEffect(() => {
    setMembersPage(1);
  }, [membersSearch, membersStatusFilter, membersPerPage]);

  // Optimized fetch: Only fetch data for active tab to eliminate server overhead
  useEffect(() => {
    if (activeSubTab === 'owners') {
      fetchGyms();
      fetchPlans();
    } else {
      fetchMembers();
    }
  }, [activeSubTab]);

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
      const memberList = Array.isArray(data) ? data : (data?.members || []);
      setMembers(memberList);
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
      const planToUse = selectedPlan || (saasPlans[0]?.id || '770f855a-535c-44f1-9604-0ba7a74c6f59');

      if (useExactDate && exactEndDate) {
        await superAdminService.activateGymWithExactDates(
          activationModal.gymId,
          planToUse,
          new Date().toISOString().split('T')[0],
          exactEndDate
        );
        showToast(`Gym account activated until ${exactEndDate}!`);
      } else {
        const days = parseInt(activationDays, 10) || 30;
        await superAdminService.activateGym(activationModal.gymId, planToUse, days);
        showToast(`Gym account activated for ${days} days!`);
      }
      const selectedPlanData = saasPlans.find(p => p.id === planToUse);
      
      setGyms(prev => prev.map(g => g.id === activationModal.gymId ? { 
        ...g, 
        status: 'active',
        saas_plans: selectedPlanData || g.saas_plans
      } : g));
      
      setActivationModal({ isOpen: false, gymId: null, gymName: '' });
      fetchGyms();
    } catch (err) {
      console.error('[GymManagement] Activation failed:', err);
      showToast('Failed to activate gym: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMemberEditSubmit(e) {
    e.preventDefault();
    if (!editMemberModal.member) return;
    try {
      setUpdatingId(editMemberModal.member.id);
      await superAdminService.updateMemberBySuperAdmin(editMemberModal.member.id, {
        full_name: editMemberModal.member.full_name,
        phone_number: editMemberModal.member.phone_number,
        membership_plan: editMemberModal.member.membership_plan,
        expiry_date: editMemberModal.member.expiry_date,
        status: editMemberModal.member.status
      });
      showToast('Athlete details & expiry date updated!');
      setEditMemberModal({ isOpen: false, member: null });
      fetchMembers();
    } catch (err) {
      showToast('Failed to update athlete details: ' + err.message, 'error');
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

  // Calculate paginated slices
  const totalGymPages = Math.max(1, Math.ceil(filteredGyms.length / gymsPerPage));
  const paginatedGyms = filteredGyms.slice((gymsPage - 1) * gymsPerPage, gymsPage * gymsPerPage);

  const totalMemberPages = Math.max(1, Math.ceil(filteredMembers.length / membersPerPage));
  const paginatedMembers = filteredMembers.slice((membersPage - 1) * membersPerPage, membersPage * membersPerPage);

  const exportGymsToCSV = () => {
    if (!filteredGyms.length) return showToast('No gyms to export', 'error');
    
    const headers = ['Gym ID', 'Gym Name', 'Owner Name', 'Owner Email', 'Status', 'Plan', 'Expires At', 'Unique Code', 'Created At'];
    const rows = filteredGyms.map(g => [
      g.id,
      `"${(g.gym_name || '').replace(/"/g, '""')}"`,
      `"${(g.owner_profile?.full_name || '').replace(/"/g, '""')}"`,
      `"${(g.owner_profile?.email || '').replace(/"/g, '""')}"`,
      g.status,
      `"${(g.saas_plans?.name || 'Starter Plan').replace(/"/g, '""')}"`,
      g.expires_at || 'None',
      g.unique_code || '',
      g.created_at
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gymix_gyms_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportMembersToCSV = () => {
    if (!filteredMembers.length) return showToast('No athletes to export', 'error');
    
    const headers = ['Athlete ID', 'Name', 'Phone', 'Email', 'Gym Name', 'Gym Code', 'Status', 'Join Date', 'Expiry Date'];
    const rows = filteredMembers.map(m => [
      m.id,
      `"${(m.full_name || '').replace(/"/g, '""')}"`,
      m.phone_number || '',
      `"${(m.profiles?.email || '').replace(/"/g, '""')}"`,
      `"${(m.gyms?.gym_name || '').replace(/"/g, '""')}"`,
      m.gyms?.unique_code || '',
      m.status,
      m.join_date || '',
      m.expiry_date || ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gymix_athletes_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />

      {/* OWNERS TAB VIEW */}
      {activeSubTab === 'owners' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Quick Status Filter Summary Cards */}
          {/* Quick Status Filter Floating Pills - Matching Subscriptions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { key: 'all', label: 'All Gyms', count: gyms.length },
              { key: 'active', label: 'Active Plans', count: gyms.filter(g => g.status === 'active').length },
              { key: 'expired', label: 'Expired', count: gyms.filter(g => g.status === 'expired').length },
              { key: 'pending', label: 'Pending', count: gyms.filter(g => g.status === 'pending').length },
              { key: 'blocked', label: 'Blocked', count: gyms.filter(g => g.status === 'blocked').length },
            ].map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isActive
                      ? 'bg-violet-700/80 text-white'
                      : 'bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters & Search - Floating on Canvas */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-[28rem] group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by gym name, ID, owner name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-200 transition-colors focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="all">All SaaS Status</option>
                <option value="active">Active Plan</option>
                <option value="expired">Expired Plan</option>
                <option value="pending">Pending</option>
                <option value="blocked">Blocked</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            </div>
            
            <button
              onClick={exportGymsToCSV}
              className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Owners Table */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse block sm:table">
                <thead className="hidden sm:table-header-group">
                  <tr className="bg-slate-50/80 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Gym & Owner Details</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Registry Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">SaaS Tier Plan</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Plan Expiry & Time Left</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Gateway Code</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="block sm:table-row-group divide-y-0 sm:divide-y sm:divide-slate-100 dark:sm:divide-zinc-800/80">
                  {paginatedGyms.map((gym) => (
                    <tr key={gym.id} className="block sm:table-row bg-white dark:bg-zinc-900 sm:bg-transparent rounded-2xl sm:rounded-none mb-4 sm:mb-0 border border-slate-200 dark:border-zinc-800 sm:border-none p-4 sm:p-0 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors group relative">
                      <td className="block sm:table-cell px-2 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-base border border-slate-200 dark:border-zinc-700 overflow-hidden shrink-0">
                            {gym.owner_profile?.avatar_url ? (
                              <img src={gym.owner_profile.avatar_url} alt="Owner" className="w-full h-full object-cover" />
                            ) : (
                              gym.gym_name ? gym.gym_name.charAt(0).toUpperCase() : 'G'
                            )}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight truncate">{gym.gym_name || 'No Name Gym'}</p>
                            
                            {gym.owner_profile ? (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1 text-slate-600 dark:text-zinc-400 text-[11px] font-semibold truncate">
                                  <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span className="truncate">{gym.owner_profile.full_name || 'Anonymous Owner'}</span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-400 dark:text-zinc-500 text-[10px] font-mono truncate">
                                  <Mail className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{gym.owner_profile.email}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-rose-500 text-[10px] font-bold">
                                <ShieldAlert className="w-3 h-3 shrink-0" />
                                <span>No Linked Owner</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="block sm:table-cell px-2 py-2 sm:px-6 sm:py-4 text-slate-500 dark:text-zinc-400 text-xs font-medium">
                        <span className="sm:hidden text-[10px] text-slate-400 uppercase font-bold mr-2">Registered:</span>
                        {new Date(gym.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="block sm:table-cell px-2 py-2 sm:px-6 sm:py-4">
                        <span className="sm:hidden text-[10px] text-slate-400 uppercase font-bold mr-2">Plan:</span>
                        <span className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                          {gym.saas_plans?.name || 'Starter Plan'}
                        </span>
                      </td>
                      <td className="block sm:table-cell px-2 py-3 sm:px-6 sm:py-4">
                        <span className="sm:hidden text-[10px] text-slate-400 uppercase font-bold block mb-1">Expiry Status:</span>
                        {gym.expires_at ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{new Date(gym.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div>
                              {gym.days_left > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  <Clock className="w-3 h-3" />
                                  {gym.days_left} {gym.days_left === 1 ? 'day' : 'days'} left
                                </span>
                              ) : gym.days_left === 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  <Clock className="w-3 h-3" />
                                  Expires Today
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                  <Clock className="w-3 h-3" />
                                  Expired ({Math.abs(gym.days_left)}d ago)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-600 text-xs font-bold">—</span>
                        )}
                      </td>
                      <td className="block sm:table-cell px-2 py-2 sm:px-6 sm:py-4 font-mono text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wide">
                        <span className="sm:hidden text-[10px] text-slate-400 uppercase font-bold mr-2">Code:</span>
                        {gym.unique_code || '—'}
                      </td>
                      <td className="block sm:table-cell px-2 py-3 sm:px-6 sm:py-4">
                        <span className="sm:hidden text-[10px] text-slate-400 uppercase font-bold mr-2">Status:</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          gym.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 
                          gym.status === 'expired' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20' : 
                          gym.status === 'blocked' ? 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20' : 
                          'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            gym.status === 'active' ? 'bg-emerald-500' : 
                            gym.status === 'expired' ? 'bg-rose-500' : 
                            gym.status === 'blocked' ? 'bg-red-500' : 
                            'bg-amber-500'
                          }`} />
                          {gym.status || 'pending'}
                        </span>
                      </td>
                      <td className="absolute sm:relative top-2 sm:top-auto right-2 sm:right-auto block sm:table-cell px-2 py-2 sm:px-6 sm:py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative">
                            <button 
                              onClick={() => setOpenMenuId(openMenuId === gym.id ? null : gym.id)}
                              className={`p-2 rounded-xl transition-all cursor-pointer border ${
                                openMenuId === gym.id 
                                  ? 'bg-emerald-600 text-white border-emerald-600' 
                                  : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700'
                              }`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === gym.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl z-20 py-2 animate-in zoom-in-95 duration-200">
                                  {gym.status !== 'active' ? (
                                    <button 
                                      onClick={() => {
                                        setActivationModal({ isOpen: true, gymId: gym.id, gymName: gym.gym_name });
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all text-left cursor-pointer"
                                    >
                                      <ShieldCheck className="w-4 h-4" />
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
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all text-left cursor-pointer"
                                    >
                                      <Ban className="w-4 h-4" />
                                      Block & Delete Auth
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => {
                                      localStorage.setItem('ghost_mode_gym_id', gym.id);
                                      localStorage.setItem('selected_gym_id', gym.id);
                                      showToast(`Ghost Mode: Inspecting ${gym.gym_name}...`);
                                      setTimeout(() => {
                                        window.location.href = '/dashboard';
                                      }, 400);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-all text-left border-t border-slate-100 dark:border-zinc-800 cursor-pointer"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Ghost Mode (Inspect Dashboard)
                                  </button>

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
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all text-left border-t border-slate-100 dark:border-zinc-800 cursor-pointer"
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
              <PaginationControls
                currentPage={gymsPage}
                totalPages={totalGymPages}
                totalItems={filteredGyms.length}
                pageSize={gymsPerPage}
                onPageChange={setGymsPage}
                onPageSizeChange={setGymsPerPage}
                itemName="gyms"
              />
              {filteredGyms.length === 0 && (
                <div className="py-20 text-center">
                  <AlertCircle className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-zinc-400 font-bold text-xs">No gyms found matching your query.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS/ATHLETES TAB VIEW */}
      {activeSubTab === 'members' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Quick Status Filter Floating Pills - Matching Subscriptions & Owners */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { key: 'all', label: 'All Athletes', count: members.length },
              { key: 'active', label: 'Active Pass', count: members.filter(m => m.status === 'active').length },
              { key: 'expired', label: 'Expired', count: members.filter(m => m.status === 'expired').length },
              { key: 'expiring_soon', label: 'Expiring Soon', count: members.filter(m => m.status === 'expiring_soon').length },
            ].map((tab) => {
              const isActive = membersStatusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setMembersStatusFilter(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isActive
                      ? 'bg-violet-700/80 text-white'
                      : 'bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters & Search - Floating on Canvas */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-[28rem] group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
              <input
                type="text"
                placeholder="Search athlete by name, phone, email, gym..."
                value={membersSearch}
                onChange={(e) => setMembersSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto relative">
              <select 
                value={membersStatusFilter}
                onChange={(e) => setMembersStatusFilter(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-200 transition-colors focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="all">All Pass Status</option>
                <option value="active">Active Pass</option>
                <option value="expired">Expired Pass</option>
                <option value="expiring_soon">Expiring Soon</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            </div>

            <button
              onClick={exportMembersToCSV}
              className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Members Table */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden relative">
            <div className="overflow-x-auto">
              {membersLoading && members.length === 0 ? (
                <div className="py-20 text-center text-slate-500 dark:text-zinc-400 font-medium text-xs">Loading athlete directory...</div>
              ) : (
                <>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Athlete Details</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Connected Gym</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Join & Expiry</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Plan / Package</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                      {paginatedMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-violet-600 dark:text-violet-400 font-black text-base border border-slate-200 dark:border-zinc-700 overflow-hidden shrink-0">
                                {(member.avatar_url || member.profiles?.avatar_url) ? (
                                  <img src={member.avatar_url || member.profiles.avatar_url} alt="Athlete" className="w-full h-full object-cover" />
                                ) : (
                                  member.full_name ? member.full_name.charAt(0).toUpperCase() : 'M'
                                )}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight truncate">{member.full_name || 'No Name Athlete'}</p>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1 text-slate-600 dark:text-zinc-400 text-[11px] font-semibold truncate">
                                    <Phone className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
                                    <span>{member.phone_number || 'No Phone'}</span>
                                  </div>
                                  {member.profiles?.email && (
                                    <div className="flex items-center gap-1 text-slate-400 dark:text-zinc-500 text-[10px] font-mono truncate">
                                      <Mail className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{member.profiles.email}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {member.gyms ? (
                              <div className="space-y-1">
                                <p className="text-slate-900 dark:text-white font-bold text-xs flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                                  {member.gyms.gym_name}
                                </p>
                                <span className="text-violet-600 dark:text-violet-400 font-mono text-[9px] font-black tracking-widest uppercase bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md inline-block">
                                  Code: {member.gyms.unique_code}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-600 text-xs font-bold">Unlinked</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1 text-[11px] font-medium">
                              <p className="text-slate-600 dark:text-zinc-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Join: {member.join_date ? new Date(member.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
                              </p>
                              <p className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-rose-500/60" />
                                <span>Expr: {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] font-bold px-2.5 py-1 rounded-xl border border-slate-200 dark:border-zinc-700">
                              <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                              {member.membership_plan || 'General Plan'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              member.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 
                              member.status === 'expired' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20' : 
                              'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                member.status === 'active' ? 'bg-emerald-500' : 
                                member.status === 'expired' ? 'bg-rose-500' : 
                                'bg-amber-500'
                              }`} />
                              {member.status || 'active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditMemberModal({ isOpen: true, member: { ...member } })}
                                className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl transition-all cursor-pointer"
                                title="Edit Athlete Details & Expiry Date"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member.id)}
                                disabled={updatingId === member.id}
                                className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                title="Delete Athlete Record & Auth Profile"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationControls
                    currentPage={membersPage}
                    totalPages={totalMemberPages}
                    totalItems={filteredMembers.length}
                    pageSize={membersPerPage}
                    onPageChange={setMembersPage}
                    onPageSizeChange={setMembersPerPage}
                    itemName="athletes"
                  />
                </>
              )}
              {filteredMembers.length === 0 && !membersLoading && (
                <div className="py-20 text-center">
                  <AlertCircle className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-zinc-400 font-bold text-xs">No athletes found matching your query.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activation Modal */}
      {activationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 w-full max-w-md relative zoom-in-95 animate-in duration-150">
            <button 
              onClick={() => setActivationModal({ isOpen: false, gymId: null, gymName: '' })}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-6 h-6 text-violet-600 dark:text-violet-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Activate Gym Account</h3>
                <p className="text-slate-500 dark:text-zinc-400 text-xs">Assign SaaS tier to <strong className="text-slate-900 dark:text-white">"{activationModal.gymName}"</strong></p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">SaaS Plan Tier</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors font-medium cursor-pointer"
                >
                  <option value="">No Plan / Starter</option>
                  {saasPlans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name} - ₹{plan.price}/mo</option>
                  ))}
                </select>
              </div>

              {/* Toggle exact date vs quick duration */}
              <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-xl p-1 gap-1 border border-slate-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setUseExactDate(false)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    !useExactDate ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Quick Duration
                </button>
                <button
                  type="button"
                  onClick={() => setUseExactDate(true)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    useExactDate ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Calendar Date
                </button>
              </div>

              {!useExactDate ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Activation Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={activationDays}
                    onChange={(e) => setActivationDays(e.target.value)}
                    placeholder="e.g. 30, 90, 365"
                    className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors font-medium"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Specify how many days the gym access remains active.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Exact Expiry Date</label>
                  <input
                    type="date"
                    value={exactEndDate}
                    onChange={(e) => setExactEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors font-medium"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Select the exact calendar date when this gym's SaaS plan will expire.</p>
                </div>
              )}

              <button 
                onClick={handleActivateSubmit}
                disabled={updatingId === activationModal.gymId}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer mt-2 active:scale-95"
              >
                {updatingId === activationModal.gymId ? 'Activating...' : (useExactDate && exactEndDate ? `Activate Until ${exactEndDate}` : `Activate for ${activationDays || 30} Days`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Athlete / Member Modal */}
      {editMemberModal.isOpen && editMemberModal.member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 w-full max-w-md relative zoom-in-95 animate-in duration-150">
            <button 
              onClick={() => setEditMemberModal({ isOpen: false, member: null })}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <Edit2 className="w-6 h-6 text-violet-600 dark:text-violet-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Edit Athlete Details</h3>
                <p className="text-slate-500 dark:text-zinc-400 text-xs">Modify athlete record across the platform.</p>
              </div>
            </div>
            
            <form onSubmit={handleMemberEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editMemberModal.member.full_name || ''}
                  onChange={(e) => setEditMemberModal({
                    ...editMemberModal,
                    member: { ...editMemberModal.member, full_name: e.target.value }
                  })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={editMemberModal.member.phone_number || ''}
                  onChange={(e) => setEditMemberModal({
                    ...editMemberModal,
                    member: { ...editMemberModal.member, phone_number: e.target.value }
                  })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Membership Plan Name</label>
                <input
                  type="text"
                  value={editMemberModal.member.membership_plan || ''}
                  onChange={(e) => setEditMemberModal({
                    ...editMemberModal,
                    member: { ...editMemberModal.member, membership_plan: e.target.value }
                  })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Plan Expiry Date</label>
                <input
                  type="date"
                  value={editMemberModal.member.expiry_date ? new Date(editMemberModal.member.expiry_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditMemberModal({
                    ...editMemberModal,
                    member: { ...editMemberModal.member, expiry_date: e.target.value }
                  })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Member Status</label>
                <select
                  value={editMemberModal.member.status || 'active'}
                  onChange={(e) => setEditMemberModal({
                    ...editMemberModal,
                    member: { ...editMemberModal.member, status: e.target.value }
                  })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium cursor-pointer focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="active">Active Pass</option>
                  <option value="expired">Expired Pass</option>
                  <option value="left">Left / Inactive</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={updatingId === editMemberModal.member.id}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer mt-2 active:scale-95"
              >
                {updatingId === editMemberModal.member.id ? 'Saving Changes...' : 'Save Athlete Changes'}
              </button>
            </form>
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
