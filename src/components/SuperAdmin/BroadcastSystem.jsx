import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Send, 
  History, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Zap,
  Trash2,
  Clock
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import { useAuth } from '../../hooks/useAuth';
import Toast from '../UI/Toast';

export default function BroadcastSystem() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info'
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const [gyms, setGyms] = useState([]);
  const [targetGymId, setTargetGymId] = useState('all');

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const [broadcastData, gymData] = await Promise.all([
        superAdminService.getBroadcasts(),
        superAdminService.getAllGyms()
      ]);
      setBroadcasts(broadcastData);
      setGyms(gymData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSending(true);
      if (targetGymId === 'all') {
        await superAdminService.createBroadcast({
          ...formData,
          created_by: user?.id
        });
        showToast('Broadcast sent successfully!');
      } else {
        await superAdminService.sendDirectMessage(targetGymId, formData);
        showToast('Direct message sent successfully!');
      }
      setFormData({ title: '', message: '', type: 'info' });
      setTargetGymId('all');
      fetchInitialData();
    } catch (err) {
      console.error('Messaging failed:', err);
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id) {
    console.log('handleDelete triggered for broadcast ID:', id);
    if (!window.confirm('Are you sure you want to delete this broadcast?')) {
      console.log('Deletion cancelled by user in confirm dialog');
      return;
    }
    try {
      console.log('Initiating deleteBroadcast API call in superAdminService...');
      await superAdminService.deleteBroadcast(id);
      console.log('Broadcast successfully deleted from database.');
      setBroadcasts(prev => prev.filter(b => b.id !== id));
      showToast('Broadcast deleted');
    } catch (err) {
      console.error('Failed to delete broadcast:', err);
      showToast(err.message || 'Failed to delete broadcast', 'error');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />
      {/* Create Broadcast Form */}
      <div className="bg-[#212121] border border-white/5 rounded-2xl p-6 space-y-6 shadow-2xl h-fit">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3390ec]/10 flex items-center justify-center text-[#3390ec]">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg tracking-tight">Create New Broadcast</h3>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Announcement will be visible to all gym owners</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest px-1">Target Audience</label>
            <select
              value={targetGymId}
              onChange={(e) => setTargetGymId(e.target.value)}
              className="w-full px-4 py-3 bg-[#1c1c1c] border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-[#3390ec]/50 transition-all appearance-none"
            >
              <option value="all">Broadcast to All Gyms</option>
              {gyms.map(gym => (
                <option key={gym.id} value={gym.id}>Direct Message: {gym.gym_name}</option>
              ))}
            </select>
          </div>
        
          <div className="space-y-1.5">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest px-1">Message Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. System Maintenance or Issue Resolved"
              className="w-full px-4 py-3 bg-[#1c1c1c] border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-[#3390ec]/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest px-1">Message Content</label>
            <textarea
              required
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Describe the update in detail..."
              className="w-full px-4 py-3 bg-[#1c1c1c] border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-[#3390ec]/50 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest px-1">Broadcast Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 bg-[#1c1c1c] border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-[#3390ec]/50 transition-all appearance-none"
              >
                <option value="info">General Info</option>
                <option value="update">New Feature</option>
                <option value="warning">Critical Warning</option>
                <option value="success">Success Story</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#3390ec] hover:bg-[#2b83d6] disabled:bg-gray-700 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-[#3390ec]/20 active:scale-95"
              >
                {sending ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending...' : 'Broadcast Now'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Broadcast History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest">Broadcast History</h3>
          </div>
          <span className="text-[10px] font-black text-[#3390ec] bg-[#3390ec]/10 px-2 py-0.5 rounded-full uppercase">
            {broadcasts.length} Sent
          </span>
        </div>

        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="py-20 text-center text-gray-600 text-xs font-bold uppercase tracking-widest">Loading History...</div>
          ) : broadcasts.length === 0 ? (
            <div className="py-20 text-center bg-[#212121] border border-white/5 rounded-2xl border-dashed">
              <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">No history yet</p>
            </div>
          ) : (
            broadcasts.map((b) => (
              <div key={b.id} className="bg-[#212121] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all space-y-3 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      b.type === 'warning' ? 'bg-red-400/10 text-red-400' :
                      b.type === 'update' ? 'bg-[#3390ec]/10 text-[#3390ec]' :
                      'bg-emerald-400/10 text-emerald-400'
                    }`}>
                      {b.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : 
                       b.type === 'update' ? <Zap className="w-4 h-4" /> : 
                       <Info className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{b.title}</h4>
                      <p className="text-gray-600 text-[10px] font-medium uppercase tracking-wider">
                        {new Date(b.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(b.id)}
                    className="relative z-10 opacity-50 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all cursor-pointer flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{b.message}</p>
                <div className="pt-2 flex items-center gap-4">
                  <div className="flex items-center gap-1 text-[9px] font-black text-gray-600 uppercase tracking-widest">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Delivered to all
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
