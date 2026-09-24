import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
  Search,
  RefreshCw,
  KeyRound,
  Mail,
  Phone,
  Building2,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  ExternalLink,
  ChevronDown,
  Lock,
  Trash2,
  ArrowUpDown,
  X
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';

export default function UserSecurityManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all | owner | member | super_admin
  const [statusFilter, setStatusFilter] = useState('all'); // all | has_gym | has_member | unlinked
  const [sortOrder, setSortOrder] = useState('newest'); // newest | oldest | name
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleChangeModal, setRoleChangeModal] = useState(null); // { user, targetRole }
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await superAdminService.getAllUserProfiles();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load user profiles:', err);
      setToast({ message: 'Error loading user profiles: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      // Status/Association filter
      if (statusFilter === 'has_gym' && !u.ownedGym) return false;
      if (statusFilter === 'has_member' && !u.memberRecord) return false;
      if (statusFilter === 'unlinked' && (u.ownedGym || u.memberRecord)) return false;

      // Search term
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        u.email?.toLowerCase().includes(s) ||
        u.full_name?.toLowerCase().includes(s) ||
        u.phone_number?.toLowerCase().includes(s) ||
        u.id?.toLowerCase().includes(s) ||
        u.ownedGym?.gym_name?.toLowerCase().includes(s) ||
        u.memberRecord?.gyms?.gym_name?.toLowerCase().includes(s)
      );
    }).sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortOrder === 'name') return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
      return 0;
    });
  }, [users, roleFilter, statusFilter, searchTerm, sortOrder]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter, sortOrder]);

  // Platform Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const owners = users.filter(u => u.role === 'owner').length;
    const members = users.filter(u => u.role === 'member').length;
    const superAdmins = users.filter(u => u.role === 'super_admin').length;
    const unlinked = users.filter(u => !u.ownedGym && !u.memberRecord && u.role !== 'super_admin').length;
    return { total, owners, members, superAdmins, unlinked };
  }, [users]);

  // Action: Trigger Password Reset Email
  const handlePasswordReset = async (user) => {
    if (!user?.email) {
      setToast({ message: 'User does not have a registered email', type: 'error' });
      return;
    }
    try {
      setActionLoading(`reset-${user.id}`);
      await superAdminService.triggerPasswordReset(user.email);
      setToast({ 
        message: `Password reset instructions dispatched to ${user.email}`, 
        type: 'success' 
      });
    } catch (err) {
      console.error('Password reset failed:', err);
      setToast({ message: 'Password reset failed: ' + err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Execute Role Change
  const confirmRoleChange = async () => {
    if (!roleChangeModal) return;
    const { user, targetRole } = roleChangeModal;
    
    if (user.email === 'scn1155@gmail.com' && targetRole !== 'super_admin') {
      setToast({ message: 'Root Super Admin cannot be demoted!', type: 'error' });
      setRoleChangeModal(null);
      return;
    }

    try {
      setActionLoading(`role-${user.id}`);
      await superAdminService.updateUserRole(user.id, targetRole);
      
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: targetRole } : u));
      if (selectedUser?.id === user.id) {
        setSelectedUser(prev => ({ ...prev, role: targetRole }));
      }

      setToast({ 
        message: `Updated ${user.full_name || user.email}'s role to ${targetRole.replace('_', ' ').toUpperCase()}`, 
        type: 'success' 
      });
      setRoleChangeModal(null);
    } catch (err) {
      console.error('Role update failed:', err);
      setToast({ message: 'Role update failed: ' + err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Execute User Deletion
  const confirmDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    if (deleteConfirmUser.email === 'scn1155@gmail.com') {
      setToast({ message: 'Cannot delete primary root super admin!', type: 'error' });
      setDeleteConfirmUser(null);
      return;
    }

    try {
      setActionLoading(`delete-${deleteConfirmUser.id}`);
      await superAdminService.deleteUser(deleteConfirmUser.id);
      
      setUsers(prev => prev.filter(u => u.id !== deleteConfirmUser.id));
      if (selectedUser?.id === deleteConfirmUser.id) {
        setSelectedUser(null);
      }
      setToast({ message: `User ${deleteConfirmUser.email} permanently removed`, type: 'success' });
      setDeleteConfirmUser(null);
    } catch (err) {
      console.error('User delete failed:', err);
      setToast({ message: 'User delete failed: ' + err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Super Admin
          </span>
        );
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Building2 className="w-3 h-3 text-indigo-400" />
            Gym Owner
          </span>
        );
      case 'member':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Users className="w-3 h-3 text-emerald-400" />
            Athlete / Member
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-300 border border-slate-500/30">
            {role || 'User'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header & Sync ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">User Security & Identity Governance</h2>
          </div>
          <p className="text-slate-500 dark:text-zinc-400 text-xs font-semibold mt-1">
            Centrally govern all 147+ platform accounts, enforce RBAC roles, trigger password recoveries, and inspect tenant links.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600 dark:text-purple-400' : ''}`} />
          <span>Refresh Accounts</span>
        </button>
      </div>

      {/* ── Metric Highlights ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Profiles</span>
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 font-medium">Registered identity records</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Gym Owners</span>
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{metrics.owners}</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 font-medium">Tenant administrators</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Athletes & Members</span>
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{metrics.members}</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 font-medium">End-user gym members</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Super Admins</span>
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{metrics.superAdmins}</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 font-medium">Root authority accounts</p>
        </div>
      </div>

      {/* ── Search & Filter Controls - Direct Floating on Canvas ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-80 group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or linked gym..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Floating Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All Roles', count: metrics.total },
              { id: 'owner', label: 'Gym Owners', count: metrics.owners },
              { id: 'member', label: 'Athletes', count: metrics.members },
              { id: 'super_admin', label: 'Super Admins', count: metrics.superAdmins }
            ].map(tab => {
              const isActive = roleFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRoleFilter(tab.id)}
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
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-zinc-400">Affiliation:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer font-medium"
            >
              <option value="all">All Profiles</option>
              <option value="has_gym">Owns a Gym</option>
              <option value="has_member">Active Athlete</option>
              <option value="unlinked">Unlinked Accounts</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-zinc-400">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
            </select>
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500">
              Showing {filteredUsers.length} users
            </span>
          </div>
        </div>
      </div>

      {/* ── Content View: Mobile Cards & Desktop Table ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
          <RefreshCw className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin mb-3" />
          <p className="text-slate-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">Loading User Security Matrix...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6">
          <Users className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto mb-3" />
          <h3 className="text-slate-900 dark:text-white text-base font-bold">No Users Found</h3>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">No user accounts matched your search criteria.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout (Visible on < lg) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {paginatedUsers.map((u) => (
              <div 
                key={u.id}
                className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-purple-500/40 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-600 dark:text-purple-400 text-sm shrink-0 overflow-hidden">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (u.full_name || u.email || 'U').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-900 dark:text-white text-sm font-bold truncate">
                        {u.full_name || 'Unnamed User'}
                      </p>
                      <p className="text-slate-500 dark:text-zinc-400 text-xs truncate font-mono">{u.email}</p>
                    </div>
                  </div>
                  {getRoleBadge(u.role)}
                </div>

                {/* Tenant Association Info */}
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-zinc-400 font-semibold">Affiliation:</span>
                    <span className="text-slate-800 dark:text-zinc-200 font-bold truncate max-w-[180px]">
                      {u.ownedGym ? (
                        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {u.ownedGym.gym_name}
                        </span>
                      ) : u.memberRecord ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {u.memberRecord.gyms?.gym_name || 'Athlete'}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-zinc-500">Unlinked Profile</span>
                      )}
                    </span>
                  </div>

                  {u.phone_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-zinc-400 font-semibold">Phone:</span>
                      <span className="text-slate-700 dark:text-zinc-300 font-mono">{u.phone_number}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-zinc-400 font-semibold">Joined:</span>
                    <span className="text-slate-600 dark:text-zinc-400">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    Details
                  </button>

                  <button
                    onClick={() => handlePasswordReset(u)}
                    disabled={actionLoading === `reset-${u.id}`}
                    title="Send Password Reset Email"
                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setRoleChangeModal({ user: u, targetRole: u.role === 'owner' ? 'member' : 'owner' })}
                    title="Change Role"
                    className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/25 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>

                  {u.email !== 'scn1155@gmail.com' && (
                    <button
                      onClick={() => setDeleteConfirmUser(u)}
                      title="Delete User"
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/25 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout (Visible on >= lg) */}
          <div className="hidden lg:block bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">User Profile</th>
                    <th className="py-3.5 px-4">Security Role</th>
                    <th className="py-3.5 px-4">Tenant Link</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Registered</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {paginatedUsers.map((u) => (
                    <tr 
                      key={u.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* Profile Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-600 dark:text-purple-400 text-xs shrink-0 overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (u.full_name || u.email || 'U').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-900 dark:text-white font-bold text-xs truncate">
                              {u.full_name || 'Unnamed Profile'}
                            </p>
                            <p className="text-slate-500 dark:text-zinc-400 text-[11px] truncate font-mono">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="py-3 px-4">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Tenant Column */}
                      <td className="py-3 px-4">
                        {u.ownedGym ? (
                          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span className="truncate max-w-[140px]">{u.ownedGym.gym_name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/15 rounded text-indigo-700 dark:text-indigo-300">Owner</span>
                          </div>
                        ) : u.memberRecord ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                            <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="truncate max-w-[140px]">{u.memberRecord.gyms?.gym_name || 'Member'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-500 text-[11px]">Unlinked</span>
                        )}
                      </td>

                      {/* Contact Column */}
                      <td className="py-3 px-4 text-slate-700 dark:text-zinc-300">
                        {u.phone_number ? (
                          <span className="font-mono text-[11px]">{u.phone_number}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-500 text-[11px]">No phone</span>
                        )}
                      </td>

                      {/* Registered Column */}
                      <td className="py-3 px-4 text-slate-500 dark:text-zinc-400 text-[11px]">
                        {new Date(u.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Switcher Button */}
                          <button
                            onClick={() => {
                              const nextRole = u.role === 'owner' ? 'member' : u.role === 'member' ? 'owner' : 'member';
                              setRoleChangeModal({ user: u, targetRole: nextRole });
                            }}
                            title="Update Role"
                            className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            Role
                          </button>

                          {/* Password Reset Button */}
                          <button
                            onClick={() => handlePasswordReset(u)}
                            disabled={actionLoading === `reset-${u.id}`}
                            title="Send Password Reset Email"
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Details Button */}
                          <button
                            onClick={() => setSelectedUser(u)}
                            title="View Full Profile & Raw ID"
                            className="p-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          {u.email !== 'scn1155@gmail.com' && (
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              title="Delete Account"
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination Controls ── */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400">
              <div>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} accounts
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-40 rounded-lg font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
                >
                  Prev
                </button>

                <div className="flex items-center gap-1 px-2">
                  <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span>
                  <span>/</span>
                  <span>{totalPages}</span>
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 disabled:opacity-40 rounded-lg font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal: User Full Profile Drawer ── */}
      {/* ── Modal: User Full Profile Drawer ── */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-bold text-slate-800 dark:text-zinc-200 text-sm overflow-hidden shrink-0">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (selectedUser.full_name || selectedUser.email || 'U').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-base">{selectedUser.full_name || 'Unnamed User'}</h3>
                    <p className="text-slate-500 dark:text-zinc-400 text-xs font-mono">{selectedUser.email}</p>
                  </div>
                </div>
                {getRoleBadge(selectedUser.role)}
              </div>

              {/* Data Properties */}
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
                  <p className="text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Identity Metadata</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500 block">User UUID:</span>
                      <span className="font-mono text-slate-800 dark:text-zinc-300 text-[11px] break-all">{selectedUser.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500 block">Phone:</span>
                      <span className="font-mono text-slate-800 dark:text-zinc-300">{selectedUser.phone_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500 block">Gender:</span>
                      <span className="text-slate-800 dark:text-zinc-300 capitalize">{selectedUser.gender || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500 block">Onboarding Status:</span>
                      <span className={selectedUser.onboarding_completed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                        {selectedUser.onboarding_completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500 block">Name Changes:</span>
                      <span className="text-slate-800 dark:text-zinc-300">{selectedUser.name_change_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500 block">Created At:</span>
                      <span className="text-slate-800 dark:text-zinc-300">{new Date(selectedUser.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Tenant Affiliation */}
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
                  <p className="text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Tenant Connections</p>
                  {selectedUser.ownedGym ? (
                    <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/20">
                      <div>
                        <p className="font-bold">{selectedUser.ownedGym.gym_name}</p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">Code: {selectedUser.ownedGym.unique_code} | Status: {selectedUser.ownedGym.status}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">Gym Owner</span>
                    </div>
                  ) : selectedUser.memberRecord ? (
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                      <div>
                        <p className="font-bold">{selectedUser.memberRecord.gyms?.gym_name || 'Gym'}</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Athlete Record: {selectedUser.memberRecord.full_name}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">Member</span>
                    </div>
                  ) : (
                    <p className="text-slate-400 dark:text-zinc-500 italic">No gym or athlete connection currently active.</p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePasswordReset(selectedUser)}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Send Password Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Role Switcher Confirmation ── */}
      <AnimatePresence>
        {roleChangeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-violet-600 dark:text-violet-400 shrink-0" />
                <div>
                  <h3 className="text-slate-900 dark:text-white font-bold text-base">Modify User Role</h3>
                  <p className="text-slate-500 dark:text-zinc-400 text-xs font-mono">{roleChangeModal.user.email}</p>
                </div>
              </div>

              <p className="text-slate-600 dark:text-zinc-300 text-xs leading-relaxed">
                Select the new platform role for{' '}
                <strong className="text-slate-900 dark:text-white">{roleChangeModal.user.full_name || roleChangeModal.user.email}</strong>.
                This instantly alters their permissions across all Gymix modules.
              </p>

              <div className="space-y-2">
                {[
                  { id: 'member', label: 'Athlete / Member', desc: 'Standard athlete app permissions' },
                  { id: 'owner', label: 'Gym Owner', desc: 'Can manage gyms, memberships & billing' },
                  { id: 'super_admin', label: 'Super Admin', desc: 'Unrestricted master console access' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRoleChangeModal(prev => ({ ...prev, targetRole: r.id }))}
                    className={`w-full p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      roleChangeModal.targetRole === r.id
                        ? 'bg-violet-500/10 border-violet-500 text-violet-700 dark:text-violet-300'
                        : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">{r.label}</span>
                      {roleChangeModal.targetRole === r.id && (
                        <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  onClick={() => setRoleChangeModal(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoleChange}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  Confirm Change
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: User Deletion Confirmation ── */}
      <AnimatePresence>
        {deleteConfirmUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-rose-500/20 rounded-2xl w-full max-w-md p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-slate-900 dark:text-white font-bold text-base">Delete User Account</h3>
                  <p className="text-rose-600 dark:text-rose-400 text-xs font-mono">{deleteConfirmUser.email}</p>
                </div>
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-300">
                <strong>Warning:</strong> This permanently deletes the user's authentication credentials, profile, linked push tokens, and member connections. This action cannot be reversed.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  onClick={() => setDeleteConfirmUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Yes, Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Toast Notifications ── */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}
    </div>
  );
}
