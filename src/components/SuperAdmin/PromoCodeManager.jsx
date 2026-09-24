import { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Calendar, 
  Users as UsersIcon,
  Copy,
  Search,
  Check,
  Percent,
  Tag,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import DatePicker from '../UI/DatePicker';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../UI/ConfirmModal';

const isCodeUsable = (code) => {
  const usageLeft = Number(code.used_count || 0) < Number(code.max_uses || 0);
  const today = new Date(new Date().toISOString().split('T')[0]);
  const dateValid = !code.expiry_date || new Date(code.expiry_date) >= today;
  return code.is_active !== false && usageLeft && dateValid;
};

export default function PromoCodeManager() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [deleteCodeId, setDeleteCodeId] = useState(null);
  const [deletingCode, setDeletingCode] = useState(false);
  
  // New Code Form State
  const [newCode, setNewCode] = useState({
    code: '',
    discount_type: 'full_free',
    discount_value: 0,
    max_uses: 1,
    expiry_date: ''
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  async function fetchCodes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCodes(data || []);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateCode = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('promo_codes')
        .insert([{
          ...newCode,
          code: newCode.code.toUpperCase().trim(),
          discount_value: newCode.discount_type === 'full_free' ? 100 : Number(newCode.discount_value || 0),
          max_uses: Number(newCode.max_uses || 1),
          expiry_date: newCode.expiry_date || null
        }]);
      
      if (error) throw error;
      
      setShowAddModal(false);
      setNewCode({
        code: '',
        discount_type: 'full_free',
        discount_value: 0,
        max_uses: 1,
        expiry_date: ''
      });
      toast.success('Promo code created successfully!');
      fetchCodes();
    } catch (err) {
      toast.error(err.message || 'Failed to create code');
    }
  };

  const handleDeleteCodeClick = (id) => {
    setDeleteCodeId(id);
  };

  const executeDeleteCode = async () => {
    if (!deleteCodeId) return;
    setDeletingCode(true);
    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', deleteCodeId);
      
      if (error) throw error;
      fetchCodes();
      setDeleteCodeId(null);
      toast.success('Promo code removed');
    } catch (err) {
      toast.error(err.message || 'Failed to delete code');
    } finally {
      setDeletingCode(false);
    }
  };

  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success(`Copied "${code}" to clipboard!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredCodes = codes.filter(c => 
    c.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = codes.filter(c => isCodeUsable(c)).length;
  const totalRedemptions = codes.reduce((acc, c) => acc + (Number(c.used_count) || 0), 0);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Tag className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Marketing & Growth</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Promo & Discount Codes</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Issue trial coupons, percent discounts, and marketing vouchers for gyms.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Promo Code</span>
        </button>
      </div>

      {/* Metric Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Total Coupons Created</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{codes.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Active & Redeemable</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Total Redemptions</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalRedemptions}</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search promo codes (e.g. WELCOME100, SUMMER)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Codes Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Loading coupons...</p>
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
          <Ticket className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">No promo codes found</h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Create your first marketing coupon to boost gym registrations.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-500 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Promo Code
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCodes.map((code) => {
            const usable = isCodeUsable(code);
            const usagePercent = Math.min(100, Math.round(((code.used_count || 0) / (code.max_uses || 1)) * 100));

            return (
              <div 
                key={code.id} 
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 transition-all relative flex flex-col justify-between"
              >
                <div>
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      usable 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${usable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {usable ? 'Active Voucher' : 'Expired / Depleted'}
                    </span>

                    <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      {code.discount_type === 'full_free' ? 'Full Free' : code.discount_type === 'percentage' ? 'Percentage' : 'Fixed Flat'}
                    </span>
                  </div>

                  {/* Promo Code Box */}
                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 shrink-0">
                        <Ticket className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono tracking-wider truncate">
                          {code.code}
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                          {code.discount_type === 'full_free' ? '1 Month Free Trial' : 
                           code.discount_type === 'percentage' ? `${code.discount_value}% Discount` : 
                           `₹${code.discount_value} Flat Off`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(code.code, code.id)}
                      title="Copy code"
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700 transition-colors shrink-0"
                    >
                      {copiedId === code.id ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Usage & Expiry Details */}
                  <div className="space-y-3 mb-4 text-xs">
                    <div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1">
                        <span className="flex items-center gap-1.5 font-medium">
                          <UsersIcon className="w-3.5 h-3.5" />
                          Redemption Capacity
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                          {code.used_count || 0} / {code.max_uses} used
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${usagePercent >= 100 ? 'bg-rose-500' : 'bg-violet-600'}`} 
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 pt-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        Valid Until
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {code.expiry_date ? new Date(code.expiry_date).toLocaleDateString() : 'No Expiry (Lifetime)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Created {code.created_at ? new Date(code.created_at).toLocaleDateString() : 'Recently'}
                  </span>
                  <button 
                    onClick={() => handleDeleteCodeClick(code.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                    title="Delete coupon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 sm:p-7 relative zoom-in-95 animate-in duration-150">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Ticket className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Promo Voucher</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Provide incentives or free access to gyms.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Coupon Code <span className="text-rose-500">*</span>
                </label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. FITPRO2026"
                  value={newCode.code}
                  onChange={(e) => setNewCode({...newCode, code: e.target.value.toUpperCase()})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-mono uppercase font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Discount Type</label>
                  <select 
                    value={newCode.discount_type}
                    onChange={(e) => setNewCode({...newCode, discount_type: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                  >
                    <option value="full_free">1 Month 100% Free</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Value {newCode.discount_type === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input 
                    disabled={newCode.discount_type === 'full_free'}
                    type="number"
                    min="0"
                    value={newCode.discount_type === 'full_free' ? 100 : newCode.discount_value}
                    onChange={(e) => setNewCode({...newCode, discount_value: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-40 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Max Redemptions</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={newCode.max_uses}
                    onChange={(e) => setNewCode({...newCode, max_uses: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Expiry Date</label>
                  <DatePicker
                    value={newCode.expiry_date}
                    onChange={(val) => setNewCode({ ...newCode, expiry_date: val })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer active:scale-95"
                >
                  Create Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteCodeId}
        title="Delete Promo Code"
        message="Are you sure you want to permanently delete this promo code? Existing gym facilities that already applied it won't be modified, but no new users can redeem it."
        confirmLabel="Delete Code"
        loading={deletingCode}
        onConfirm={executeDeleteCode}
        onCancel={() => setDeleteCodeId(null)}
      />
    </div>
  );
}
