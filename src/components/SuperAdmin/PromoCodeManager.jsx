import { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Calendar, 
  Users as UsersIcon,
  Copy,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import DatePicker from '../UI/DatePicker';
import { toast } from 'react-hot-toast';

const isCodeUsable = (code) => {
  const usageLeft = Number(code.used_count || 0) < Number(code.max_uses || 0);
  const today = new Date(new Date().toISOString().split('T')[0]);
  const dateValid = !code.expiry_date || new Date(code.expiry_date) >= today;
  return code.is_active && usageLeft && dateValid;
};

export default function PromoCodeManager() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Code Form
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
          code: newCode.code.toUpperCase(),
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
      fetchCodes();
    } catch (err) {
      toast.error(err.message || 'Failed to create code');
    }
  };

  const handleDeleteCode = async (id) => {
    if (!confirm('Are you sure you want to delete this code?')) return;
    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchCodes();
    } catch (err) {
      toast.error(err.message || 'Failed to delete code');
    }
  };

  const filteredCodes = codes.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text"
            placeholder="Search promo codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#212121] border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#3390ec]/50 transition-all"
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#3390ec] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#2b83d6] transition-all shadow-xl shadow-[#3390ec]/20"
        >
          <Plus className="w-4 h-4" />
          Generate New Code
        </button>
      </div>

      {/* Codes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#3390ec]/20 border-t-[#3390ec] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCodes.map((code) => (
            <div key={code.id} className="bg-[#212121] border border-white/5 rounded-3xl p-6 relative group overflow-hidden">
              {/* Status Badge */}
              <div className={`absolute top-0 right-0 px-4 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-xl ${
                isCodeUsable(code) ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {isCodeUsable(code) ? 'Active' : 'Inactive'}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#3390ec]/10 flex items-center justify-center text-[#3390ec]">
                  <Ticket className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tighter">{code.code}</h3>
                  <p className="text-gray-500 text-[10px] font-bold uppercase">
                    {code.discount_type === 'full_free' ? '1 Month Free SaaS' : 
                     code.discount_type === 'percentage' ? `${code.discount_value}% Discount` : 
                     `₹${code.discount_value} OFF`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <UsersIcon className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Usage</span>
                  </div>
                  <p className="text-white font-bold text-sm">{code.used_count} / {code.max_uses}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Expires</span>
                  </div>
                  <p className="text-white font-bold text-sm">
                    {code.expiry_date ? new Date(code.expiry_date).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(code.code);
                    toast.success('Code copied!');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
                <button 
                  onClick={() => handleDeleteCode(code.id)}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1c1c1c] border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-2">Generate <span className="text-[#3390ec]">Promo Code</span></h2>
            <p className="text-gray-500 text-xs font-medium mb-8">Create discounts or 1-month free SaaS access codes for gym owners.</p>

            <form onSubmit={handleCreateCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Promo Code</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. WELCOME100"
                  value={newCode.code}
                  onChange={(e) => setNewCode({...newCode, code: e.target.value.toUpperCase()})}
                  className="w-full bg-[#212121] border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#3390ec]/50 transition-all uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Type</label>
                  <select 
                    value={newCode.discount_type}
                    onChange={(e) => setNewCode({...newCode, discount_type: e.target.value})}
                    className="w-full bg-[#212121] border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#3390ec]/50 transition-all text-xs font-bold"
                  >
                    <option value="full_free">1 Month Free</option>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Value</label>
                  <input 
                    disabled={newCode.discount_type === 'full_free'}
                    type="number"
                    value={newCode.discount_type === 'full_free' ? 100 : newCode.discount_value}
                    onChange={(e) => setNewCode({...newCode, discount_value: e.target.value})}
                    className="w-full bg-[#212121] border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#3390ec]/50 transition-all font-bold disabled:opacity-30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Max Uses</label>
                  <input 
                    type="number"
                    value={newCode.max_uses}
                    onChange={(e) => setNewCode({...newCode, max_uses: e.target.value})}
                    className="w-full bg-[#212121] border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#3390ec]/50 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Expiry</label>
                  <DatePicker
                    value={newCode.expiry_date}
                    onChange={(val) => setNewCode({ ...newCode, expiry_date: val })}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white bg-[#3390ec] hover:bg-[#2b83d6] transition-all shadow-xl shadow-[#3390ec]/20"
                >
                  Confirm & Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
