import { useState, useEffect, useCallback } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  ShieldCheck, 
  Download, 
  Trash2, 
  LogOut, 
  CheckCircle2, 
  Mail, 
  Fingerprint,
  Calendar,
  Zap,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowLeft,
  LifeBuoy,
  MessageSquare,
  Clock,
  CornerDownRight,
  Copy,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  Smartphone,
  Scan,
  RefreshCw,
  Power
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCurrentGym } from '../hooks/useCurrentGym';
import { supabase } from '../lib/supabaseClient';
import { planService } from '../services/planService';
import ConfirmModal from '../components/UI/ConfirmModal';
// ... imports
import { Plus, X as CloseIcon, Edit2, Sparkles } from 'lucide-react';

const WA_PRESETS = [
  { label: 'Professional Reminder', text: 'Hello {{name}}, this is a friendly reminder that your {{plan}} plan expires on {{date}}. Please renew to avoid interruption.' },
  { label: 'Urgent Expiry', text: 'URGENT: {{name}}, your gym plan has expired on {{date}}. Please contact the front desk immediately.' },
  { label: 'Friendly Greeting', text: 'Hey {{name}}! Hope you are crushing your workouts. Your current plan expires on {{date}}.' }
];

/* ── Section wrapper ── */
function Section({ icon, title, description, children, id }) {
  return (
    <div id={id} className="bg-[#212121] border border-white/5 rounded-xl p-6 transition-all duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-[#3390ec]">
          {icon}
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">{title}</h3>
          {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/* ── Input field ── */
function Field({ label, id, ...props }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-gray-400 px-1">{label}</label>
      <input
        id={id}
        className="w-full bg-[#1c1c1c] border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#3390ec]/50 transition-all"
        {...props}
      />
    </div>
  );
}

/* ── Toast ── */
function Toast({ message, type, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] min-w-[300px] animate-in slide-in-from-top-4">
      <div className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg shadow-xl border border-white/5 ${
        type === 'success' ? 'bg-[#212121] text-emerald-400' : 'bg-[#212121] text-red-400'
      }`}>
        <div className="flex items-center gap-3">
          {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-medium">{message}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded transition-colors">
          <Trash2 className="w-4 h-4 opacity-50" />
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, signIn, signOut, updatePassword, resetPasswordForEmail } = useAuth();
  const { gym, gymName, gymLoading, gymError, updateGymName, ownerEmail } = useCurrentGym();
  const navigate = useNavigate();
  const gymId = gym?.id ?? null;

  // Gym Coins Loyalty settings states
  const [enableGymCoins, setEnableGymCoins] = useState(gym?.enable_gym_coins || false);
  const [coinRewardPerCheckin, setCoinRewardPerCheckin] = useState(gym?.coin_reward_per_checkin || 10);
  const [coinRewardPerStreakMilestone, setCoinRewardPerStreakMilestone] = useState(gym?.coin_reward_per_streak_milestone || 50);
  const [savingCoinsSettings, setSavingCoinsSettings] = useState(false);

  // Biometric integration states
  const [biometricEnabled, setBiometricEnabled] = useState(gym?.biometric_enabled || false);
  const [biometricDeviceSerial, setBiometricDeviceSerial] = useState(gym?.biometric_device_serial || '');
  const [biometricApiKey, setBiometricApiKey] = useState(gym?.biometric_api_key || '');
  const [savingBiometricSettings, setSavingBiometricSettings] = useState(false);
  const [pwaGuideTab, setPwaGuideTab] = useState('zkteco'); // 'zkteco' | 'hikvision'

  useEffect(() => {
    if (gym) {
      setEnableGymCoins(gym.enable_gym_coins || false);
      setCoinRewardPerCheckin(gym.coin_reward_per_checkin || 10);
      setCoinRewardPerStreakMilestone(gym.coin_reward_per_streak_milestone || 50);
      setBiometricEnabled(gym.biometric_enabled || false);
      setBiometricDeviceSerial(gym.biometric_device_serial || '');
      setBiometricApiKey(gym.biometric_api_key || '');
    }
  }, [gym]);

  const handleSaveBiometricSettings = async () => {
    if (!gym?.id) return;
    setSavingBiometricSettings(true);
    try {
      const { error } = await supabase
        .from('gyms')
        .update({
          biometric_enabled: biometricEnabled,
          biometric_device_serial: biometricDeviceSerial.trim() || null
        })
        .eq('id', gym.id);

      if (error) throw error;
      showToast('Biometric integration settings updated successfully!');
      
      // Clear local storage cache for the gym so cache re-fetches updated settings
      localStorage.removeItem(`gym_cache_${user.id}`);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      showToast(err.message || 'Failed to save biometric settings', 'error');
    } finally {
      setSavingBiometricSettings(false);
    }
  };

  const [testBioId, setTestBioId] = useState('');
  const [simulatingBio, setSimulatingBio] = useState(false);

  const handleSimulateBiometric = async () => {
    if (!testBioId.trim() || !gym?.biometric_device_serial || !gym?.biometric_api_key) return;
    setSimulatingBio(true);
    try {
      const { data, error } = await supabase
        .rpc('log_biometric_attendance', {
          p_device_serial: gym.biometric_device_serial,
          p_biometric_api_key: gym.biometric_api_key,
          p_biometric_user_id: testBioId.trim()
        });

      if (error) throw error;

      if (data?.success) {
        showToast(`Simulation Success: ${data.member_name} ${data.action === 'checkin' ? 'Checked In' : 'Checked Out'}! ✅`);
        setTestBioId('');
      } else {
        showToast(data?.error || 'Simulation failed ❌', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to run biometric simulator ❌', 'error');
    } finally {
      setSimulatingBio(false);
    }
  };

  const handleSaveCoinsSettings = async () => {
    if (!gym?.id) return;
    setSavingCoinsSettings(true);
    try {
      const { error } = await supabase
        .from('gyms')
        .update({
          enable_gym_coins: enableGymCoins,
          coin_reward_per_checkin: parseInt(coinRewardPerCheckin),
          coin_reward_per_streak_milestone: parseInt(coinRewardPerStreakMilestone)
        })
        .eq('id', gym.id);

      if (error) throw error;
      showToast('Gym Loyalty Coins settings updated successfully!');
      
      // Clear local storage cache for the gym so GymProvider re-fetches updated settings
      localStorage.removeItem(`gym_cache_${user.id}`);
      // Refresh current gym context without hard-reload if possible, or reload cleanly
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      showToast(err.message || 'Failed to save coins settings', 'error');
    } finally {
      setSavingCoinsSettings(false);
    }
  };

  // Password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Danger zone modal state
  const [showDangerModal, setShowDangerModal] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Support ticket state
  const [ticket, setTicket] = useState({
    subject: '',
    category: 'other',
    priority: 'low',
    description: ''
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [userTickets, setUserTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedUserTicket, setSelectedUserTicket] = useState(null);

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Membership Plans state
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', duration_days: 30, price: 0 });
  const [deletePlanId, setDeletePlanId] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  const openAddPlanModal = () => {
    setEditingPlan(null);
    setPlanForm({ name: '', duration_days: 30, price: 0 });
    setShowPlanModal(true);
  };

  const openEditPlanModal = (plan) => {
    setEditingPlan(plan);
    setPlanForm({ name: plan.name, duration_days: plan.duration_days, price: plan.price });
    setShowPlanModal(true);
  };

  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const getObfuscatedEmail = (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  };



  // Load plans
  const fetchPlans = useCallback(async () => {
    if (!gymId) return;
    setLoadingPlans(true);
    try {
      const data = await planService.getPlans(gymId);
      setPlans(data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  }, [gymId]);

  const fetchUserTickets = useCallback(async () => {
    if (!gymId) return;
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUserTickets(data || []);
    } catch (err) {
      console.error('Failed to fetch user tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  }, [gymId]);

  // Global Settings (Stored in LocalStorage)
  const [globalSettings, setGlobalSettings] = useState({ 
    currency: '₹', 
    waTemplate: 'Hello {{name}}, your plan expires on {{date}}.',
    waAutopilotEnabled: false,
    waConnected: false,
    waConnectedNumber: '',
    waGatewayUrl: 'http://localhost:5000'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // WhatsApp Gateway states
  const [waSessionState, setWaSessionState] = useState('disconnected'); // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
  const [waCountdown, setWaCountdown] = useState(45);
  const [testPhone, setTestPhone] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [sendingTestMessage, setSendingTestMessage] = useState(false);
  const [waQrImage, setWaQrImage] = useState('');
  const [isRealBackend, setIsRealBackend] = useState(false);

  const WA_BACKEND_URL = import.meta.env.VITE_WA_BACKEND_URL || 'http://localhost:5000';

  // Check server connection and status on mount
  useEffect(() => {
    fetchPlans();
    fetchUserTickets();
    if (!gymId) return;

    // Load initial local settings
    try {
      const saved = localStorage.getItem(`gym_settings_${gymId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setGlobalSettings({
          currency: '₹',
          waTemplate: 'Hello {{name}}, your plan expires on {{date}}.',
          waAutopilotEnabled: false,
          waConnected: false,
          waConnectedNumber: '',
          waGatewayUrl: 'http://localhost:5000',
          ...parsed
        });
        if (parsed.waConnected) {
          setWaSessionState('connected');
        }
      }
    } catch { /* ignore */ }

    // Query active server status
    const checkServerStatus = async () => {
      try {
        const res = await fetch(`${WA_BACKEND_URL}/api/whatsapp/status?gymId=${gymId}`);
        if (res.ok) {
          const data = await res.json();
          setIsRealBackend(true);
          if (data.status === 'connected') {
            setWaSessionState('connected');
            setGlobalSettings(prev => {
              const updated = {
                ...prev,
                waConnected: true,
                waConnectedNumber: data.connectedNumber ? `+${data.connectedNumber}` : 'Linked Device'
              };
              localStorage.setItem(`gym_settings_${gymId}`, JSON.stringify(updated));
              return updated;
            });
          } else if (data.status === 'disconnected') {
            setWaSessionState('disconnected');
            setGlobalSettings(prev => {
              const updated = { ...prev, waConnected: false, waConnectedNumber: '' };
              localStorage.setItem(`gym_settings_${gymId}`, JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch (err) {
        console.log('[Gymix WA] Central server offline.');
        setIsRealBackend(false);
      }
    };

    checkServerStatus();
  }, [gymId, fetchPlans, fetchUserTickets]);

  // Real-time server polling
  useEffect(() => {
    let countdownInterval;
    let pollInterval;

    // 1. Ticking countdown timer (only active during qr_ready)
    if (waSessionState === 'qr_ready') {
      countdownInterval = setInterval(() => {
        setWaCountdown(prev => {
          if (prev <= 1) {
            setWaSessionState('disconnected');
            setWaQrImage('');
            showToast('QR Code expired. Please generate a new one.', 'error');
            return 45;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // 2. Active status polling from the backend (runs in connecting or qr_ready)
    if ((waSessionState === 'connecting' || waSessionState === 'qr_ready') && isRealBackend) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${WA_BACKEND_URL}/api/whatsapp/status?gymId=${gymId}`);
          if (res.ok) {
            const data = await res.json();
            
            if (data.status === 'connected') {
              clearInterval(pollInterval);
              if (countdownInterval) clearInterval(countdownInterval);
              const updatedSettings = {
                ...globalSettings,
                waConnected: true,
                waConnectedNumber: data.connectedNumber ? `+${data.connectedNumber}` : 'Linked Device'
              };
              setGlobalSettings(updatedSettings);
              localStorage.setItem(`gym_settings_${gymId}`, JSON.stringify(updatedSettings));
              setWaSessionState('connected');
              setWaQrImage('');
              showToast(`WhatsApp Linked successfully! Connected as ${updatedSettings.waConnectedNumber} 🟢`);
            } 
            else if (data.status === 'qr_ready' && data.qrCodeUrl) {
              setWaSessionState('qr_ready');
              if (data.qrCodeUrl !== waQrImage) {
                setWaQrImage(data.qrCodeUrl);
              }
            } 
            else if (data.status === 'disconnected') {
              clearInterval(pollInterval);
              if (countdownInterval) clearInterval(countdownInterval);
              setWaSessionState('disconnected');
              setWaQrImage('');
              showToast('WhatsApp initialization failed. Check server logs.', 'error');
            }
          }
        } catch (err) {
          console.warn('[Gymix WA] Status polling failed');
        }
      }, 2000);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [waSessionState, globalSettings, gymId, isRealBackend, waQrImage]);

  const handleStartWaSession = async () => {
    if (!isRealBackend) {
      return showToast('WhatsApp Server Gateway is currently offline. Please start the server.', 'error');
    }

    setWaSessionState('connecting');
    setWaQrImage('');

    try {
      const res = await fetch(`${WA_BACKEND_URL}/api/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gymId })
      });
      if (res.ok) {
        const data = await res.json();
        setWaCountdown(45);
        if (data.qrCodeUrl) {
          setWaQrImage(data.qrCodeUrl);
          setWaSessionState('qr_ready');
          showToast('Dynamic WhatsApp Web QR generated. Scan with your phone.');
        } else {
          // If the backend has just started the launch process, stay in connecting state
          setWaSessionState('connecting');
          showToast('Initializing security session... Please wait.');
        }
      } else {
        throw new Error('Connection failed');
      }
    } catch (err) {
      setWaSessionState('disconnected');
      showToast('Failed to connect to WhatsApp Gateway Server.', 'error');
    }
  };

  const handleDisconnectWa = async () => {
    const updatedSettings = {
      ...globalSettings,
      waConnected: false,
      waConnectedNumber: ''
    };
    setGlobalSettings(updatedSettings);
    localStorage.setItem(`gym_settings_${gymId}`, JSON.stringify(updatedSettings));
    setWaSessionState('disconnected');
    setWaQrImage('');

    if (isRealBackend) {
      try {
        await fetch(`${WA_BACKEND_URL}/api/whatsapp/disconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gymId })
        });
      } catch (err) {
        console.warn('[Gymix WA] Failed to disconnect server session');
      }
    }
    showToast('WhatsApp session disconnected successfully.');
  };

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) return showToast('Please enter a valid phone number', 'error');
    setSendingTestMessage(true);

    const messageContent = 'Hello! This is a test message dispatched from Gymix Autopilot Gateway. Your device linking is fully operational! 🟢🚀';

    if (isRealBackend) {
      try {
        const res = await fetch(`${WA_BACKEND_URL}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gymId,
            phone: testPhone,
            message: messageContent
          })
        });
        if (res.ok) {
          showToast(`Real WhatsApp message sent successfully to ${testPhone}! 🚀`);
        } else {
          const data = await res.json();
          throw new Error(data.error || 'Failed to dispatch');
        }
      } catch (err) {
        showToast(err.message || 'Server dispatch failed, trying simulated mode...', 'error');
        // Simulated fallback
        runSimulatedTestMessage();
      } finally {
        setSendingTestMessage(false);
        setShowTestModal(false);
        setTestPhone('');
      }
    } else {
      runSimulatedTestMessage();
    }
  };

  const runSimulatedTestMessage = () => {
    setTimeout(() => {
      setSendingTestMessage(false);
      setShowTestModal(false);
      setTestPhone('');
      showToast(`Test message sent successfully to ${testPhone}! [Simulated Mode] 🚀`);
    }, 1500);
  };

  // Support Scroll & Glow effect
  useEffect(() => {
    if (window.location.hash === '#support' || window.location.hash === '#support-center') {
      setTimeout(() => {
        const el = document.getElementById('support-center');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight with a pulse ring
          el.classList.add('border-[#3390ec]/80', 'ring-2', 'ring-[#3390ec]/20');
          setTimeout(() => {
            el.classList.remove('border-[#3390ec]/80', 'ring-2', 'ring-[#3390ec]/20');
          }, 3000);
        }
      }, 500);
    }
  }, []);

  // Handle auto-opening ticket from notifications page query param (?ticketId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketId = params.get('ticketId');
    if (ticketId && userTickets.length > 0) {
      const found = userTickets.find(t => t.id === ticketId);
      if (found) {
        setSelectedUserTicket(found);
        // Clean query parameters from URL to avoid repeated auto-open
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [userTickets]);

  const handleSaveGlobalSettings = () => {
    if (!gym?.id) return;
    setSavingSettings(true);
    try {
      localStorage.setItem(`gym_settings_${gym.id}`, JSON.stringify(globalSettings));
      showToast('Global settings updated successfully!');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.duration_days || planForm.price === '' || isNaN(planForm.price)) {
      return showToast('Please fill all fields', 'error');
    }
    setLoadingPlans(true);
    try {
      if (editingPlan) {
        const updateData = {
          name: planForm.name,
          duration_days: parseInt(planForm.duration_days),
          price: parseFloat(planForm.price)
        };
        await planService.updatePlan(editingPlan.id, updateData);
        showToast('Plan updated successfully!');
      } else {
        const createData = {
          name: planForm.name,
          duration_days: parseInt(planForm.duration_days),
          price: parseFloat(planForm.price)
        };
        await planService.createPlan(gym.id, createData);
        showToast('Plan added successfully!');
      }
      setShowPlanModal(false);
      fetchPlans();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleDeletePlanClick = (id) => {
    setDeletePlanId(id);
  };

  const executeDeletePlan = async () => {
    if (!deletePlanId) return;
    setDeletingPlan(true);
    try {
      await planService.deletePlan(deletePlanId);
      showToast('Plan deleted successfully!');
      fetchPlans();
      setDeletePlanId(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingPlan(false);
    }
  };



  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) return showToast('Please fill all password fields', 'error');
    if (newPw.length < 6) return showToast('Password must be at least 6 characters', 'error');
    if (newPw !== confirmPw) return showToast('Passwords do not match', 'error');
    setSavingPw(true);
    try {
      // Verify current password by attempting to sign in
      await signIn(user.email, currentPw);
      await updatePassword(newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      showToast('Password updated successfully!');
    } catch (err) {
      if (err?.message?.toLowerCase().includes('invalid login credentials')) {
        showToast('Current password is incorrect', 'error');
      } else {
        showToast(err?.message || 'Failed to change password', 'error');
      }
    } finally {
      setSavingPw(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      await resetPasswordForEmail(user.email);
      showToast('Password reset link sent to your email!');
    } catch (err) {
      showToast(err.message || 'Failed to send reset link', 'error');
    }
  };

  const handleExportCSV = async () => {
    if (!gym) return;
    setExporting(true);
    try {
      const { data: members, error } = await supabase
        .from('members')
        .select('full_name, phone_number, gender, join_date, membership_plan, expiry_date, status, notes')
        .eq('gym_id', gym.id)
        .order('full_name');
      if (error) throw error;
      if (!members || members.length === 0) return showToast('No members to export', 'error');

      const headers = ['Full Name', 'Phone', 'Gender', 'Join Date', 'Plan', 'Expiry Date', 'Status', 'Notes'];
      const rows = members.map(m => [
        m.full_name, m.phone_number || '', m.gender || '', m.join_date || '',
        m.membership_plan || '', m.expiry_date || '', m.status || '', (m.notes || '').replace(/,/g, ';')
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gymName || 'gym'}_members_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${members.length} members successfully!`);
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!ticket.subject || !ticket.description) return showToast('Please fill subject and description', 'error');
    if (!gym?.id || !user?.id) return;
    
    setSubmittingTicket(true);
    try {
      const { error } = await supabase.from('support_tickets').insert([{
        gym_id: gym.id,
        user_id: user.id,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        description: ticket.description,
        status: 'open'
      }]);
      if (error) throw error;
      showToast('Support ticket submitted successfully!');
      setTicket({ subject: '', category: 'other', priority: 'low', description: '' });
      fetchUserTickets();
    } catch (err) {
      showToast(err.message || 'Failed to submit ticket', 'error');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleDeleteAllMembers = async () => {
    if (deleteConfirm !== 'DELETE') return showToast('Type DELETE to confirm', 'error');
    if (!gym) return;
    setDeleting(true);
    try {
      // 1. Fetch member ids for this gym to clean up member-specific sub-logs
      const { data: gymMembers } = await supabase
        .from('members')
        .select('id')
        .eq('gym_id', gym.id);
      const memberIds = gymMembers?.map(m => m.id) || [];

      if (memberIds.length > 0) {
        await supabase.from('member_coins_transactions').delete().in('member_id', memberIds);
        await supabase.from('member_progress_logs').delete().in('member_id', memberIds);
        await supabase.from('member_xp_transactions').delete().in('member_id', memberIds);
      }

      // 2. Cascade delete other gym-level dependent records to avoid FK constraints
      await supabase.from('leaderboard_season_history').delete().eq('gym_id', gym.id);
      await supabase.from('leaderboard_seasons').delete().eq('gym_id', gym.id);
      await supabase.from('attendance').delete().eq('gym_id', gym.id);
      await supabase.from('connection_requests').delete().eq('gym_id', gym.id);
      await supabase.from('payments').delete().eq('gym_id', gym.id);
      await supabase.from('subscriptions').delete().eq('gym_id', gym.id);
      await supabase.from('notifications').delete().eq('gym_id', gym.id);
      await supabase.from('members').delete().eq('gym_id', gym.id);

      setDeleteConfirm('');
      setShowDangerModal(false);
      showToast('All gym data has been deleted.');
    } catch (err) {
      showToast(err.message || 'Deletion failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      localStorage.clear();
      window.location.href = '/login';
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-28 sm:pb-8">
      {gymLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-white/10 border-t-[#3390ec] rounded-full animate-spin" />
        </div>
      )}
      {!gymLoading && (
      <>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {gymError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="text-sm font-medium">
            <strong>Warning:</strong> {gymError}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg bg-[#212121] border border-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your gym account and preferences</p>
        </div>
      </div>

      <div className="grid gap-6">


        {/* Membership Plans */}
        <Section 
          icon={<Calendar className="w-5 h-5" />}
          title="Membership Plans" 
          description="Define your own subscription tiers and pricing"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {plans.map(plan => {
                const isTrial = plan.id === 'trial_default';
                return (
                  <div key={plan.id} className="p-5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-[#3390ec]/30 flex flex-col justify-between group transition-all duration-300 min-h-[110px] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#3390ec] opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-bold text-white tracking-wide truncate group-hover:text-[#3390ec] transition-colors">{plan.name}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Plan Tier</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isTrial ? (
                          <>
                            <button 
                              onClick={() => openEditPlanModal(plan)}
                              title="Edit Plan"
                              className="p-2 rounded-xl bg-white/5 hover:bg-[#3390ec]/20 text-gray-400 hover:text-white transition-all transform active:scale-95"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeletePlanClick(plan.id)}
                              title="Delete Plan"
                              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all transform active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                            System
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.03]">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white/5 px-2.5 py-0.5 rounded">
                        {plan.duration_days} Days
                      </span>
                      <span className="text-sm font-black text-[#3390ec]">
                        ₹{plan.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              <button 
                onClick={openAddPlanModal}
                className="p-5 rounded-2xl border-2 border-dashed border-white/5 hover:border-[#3390ec]/30 hover:bg-[#3390ec]/5 text-gray-500 hover:text-[#3390ec] transition-all duration-300 flex flex-col items-center justify-center gap-2 min-h-[110px] w-full"
              >
                <Plus className="w-5 h-5 mb-1 text-gray-600 group-hover:text-[#3390ec] transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest">Add New Plan</span>
              </button>
            </div>
          </div>
        </Section>

        {/* Gym Loyalty Coins */}
        <Section 
          icon={<Sparkles className="w-5.5 h-5.5 text-amber-400 fill-amber-400/20" />}
          title="Gym Loyalty Coins" 
          description="Reward members with loyalty coins for check-ins, active streaks, and dedication"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4.5 rounded-2xl bg-white/[0.01] border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Enable Gym Loyalty Coins</p>
                <p className="text-[10px] text-gray-500 font-medium">Turn rewards on/off. Great for small gyms to control balances.</p>
              </div>
              <button
                type="button"
                onClick={() => setEnableGymCoins(!enableGymCoins)}
                className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer relative flex items-center ${enableGymCoins ? 'bg-emerald-500' : 'bg-white/10'}`}
              >
                <span className={`w-5 h-5 bg-white rounded-full shadow-md transition-all absolute ${enableGymCoins ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {enableGymCoins && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in duration-300">
                <Field 
                  label="Coins Earned per Check-in" 
                  id="settings-coins-checkin" 
                  type="number" 
                  value={coinRewardPerCheckin} 
                  onChange={e => setCoinRewardPerCheckin(e.target.value)} 
                  placeholder="e.g. 10" 
                />
                <Field 
                  label="Coins Earned per Streak Milestone" 
                  id="settings-coins-streak" 
                  type="number" 
                  value={coinRewardPerStreakMilestone} 
                  onChange={e => setCoinRewardPerStreakMilestone(e.target.value)} 
                  placeholder="e.g. 50" 
                />
              </div>
            )}

            <div className="pt-2">
              <button 
                onClick={handleSaveCoinsSettings} 
                disabled={savingCoinsSettings} 
                className="px-6 py-2.5 bg-[#3390ec] hover:bg-[#2b7ad2] disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all"
              >
                {savingCoinsSettings ? 'Saving...' : 'Save Loyalty Settings'}
              </button>
            </div>
          </div>
        </Section>

        {/* Universal Biometric Integration */}
        <Section 
          icon={<Fingerprint className="w-5.5 h-5.5 text-[#10B981] fill-[#10B981]/10" />}
          title="Universal Biometric Integration" 
          description="Direct Cloud Plug-and-Play sync for ZKTeco, eSSL, BioMax, Realtime & Hikvision terminals"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4.5 rounded-2xl bg-white/[0.01] border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Enable Biometric Attendance System</p>
                <p className="text-[10px] text-gray-500 font-medium">Link face/fingerprint terminals with cloud webhook auto check-ins. QR stays standard.</p>
              </div>
              <button
                type="button"
                onClick={() => setBiometricEnabled(!biometricEnabled)}
                className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer relative flex items-center ${biometricEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
              >
                <span className={`w-5 h-5 bg-white rounded-full shadow-md transition-all absolute ${biometricEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {biometricEnabled && (
              <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field 
                    label="Device Serial Number (Must be Unique)" 
                    id="settings-bio-serial" 
                    type="text" 
                    value={biometricDeviceSerial} 
                    onChange={e => setBiometricDeviceSerial(e.target.value)} 
                    placeholder="e.g. ZK9500-2026113" 
                  />
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 px-1">Cloud API Webhook Address (Device Target)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        readOnly 
                        value="https://api.gymix.fit/v1/biometric-push"
                        className="w-full bg-[#161616] border border-white/5 rounded-lg pl-4 pr-12 py-2.5 text-xs text-gray-400 focus:outline-none transition-all select-all font-mono"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("https://api.gymix.fit/v1/biometric-push");
                          showToast('Server URL copied to clipboard!');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 px-1">Device Key / Secret Key</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        readOnly 
                        value={biometricApiKey || 'Not generated'}
                        className="w-full bg-[#161616] border border-white/5 rounded-lg pl-4 pr-12 py-2.5 text-xs text-gray-400 focus:outline-none transition-all select-all font-mono"
                      />
                      {biometricApiKey && (
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(biometricApiKey);
                            showToast('Device Key copied to clipboard!');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy Key"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-500/70 leading-normal flex items-start gap-2.5 font-medium">
                    <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 text-amber-500" />
                    <div>
                      <span className="font-bold text-amber-400">Important:</span> Copy this Device Key and Server Webhook URL into your biometric machine communication setup. Gymix will reject logs from unknown machines.
                    </div>
                  </div>
                </div>

                {/* Platform Manual Guide Panel inside Settings */}
                <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Biometric Device Integration Guides:</p>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setPwaGuideTab('zkteco')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${pwaGuideTab === 'zkteco' ? 'bg-white/5 border-white/10 text-[#10B981]' : 'bg-transparent border-transparent text-slate-400'}`}
                    >
                      eSSL / ZKTeco / BioMax / Realtime Setup
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPwaGuideTab('hikvision')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${pwaGuideTab === 'hikvision' ? 'bg-white/5 border-white/10 text-[#863BFF]' : 'bg-transparent border-transparent text-slate-400'}`}
                    >
                      Hikvision Setup
                    </button>
                  </div>
                  
                  {pwaGuideTab === 'zkteco' ? (
                    <div className="text-[10px] text-slate-400 space-y-1.5 leading-normal">
                      <p className="font-bold text-slate-200">1. Open the Machine Menu (press and hold M/OK).</p>
                      <p>2. Go to <span className="text-white font-bold">Comm. (Communication) Settings</span> -&gt; <span className="text-white font-bold">ADMS / Cloud Server</span>.</p>
                      <p>3. Enable <span className="text-[#10B981] font-bold">Cloud Server / Server Settings</span> and select <span className="text-white font-bold">Domain Name</span>.</p>
                      <p>4. Set Server Address to <span className="text-white font-mono font-bold select-all">api.gymix.fit</span> and Port to <span className="text-white font-bold">80</span>.</p>
                      <p>5. Save changes and restart the machine; it will automatically connect ONLINE! 🟢 (Note: eSSL, ZKTeco, BioMax, Realtime and other ADMS push terminals use this exact same setup).</p>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 space-y-1.5 leading-normal">
                      <p className="font-bold text-slate-200">1. Log into the Hikvision IVMS portal or machine interface.</p>
                      <p>2. Go to <span className="text-white font-bold">Network Configuration</span> -&gt; <span className="text-white font-bold">Advanced Settings</span> -&gt; <span className="text-white font-bold">ISUP/EHome</span>.</p>
                      <p>3. Enable ISUP and select Protocol Version <span className="text-white font-bold">ISUP5.0</span>.</p>
                      <p>4. Set Server Address to <span className="text-[#863BFF] font-mono font-bold select-all">api.gymix.fit</span> and configure the target port.</p>
                      <p>5. Copy your machine's actual Serial Number and update it in the **Device Serial Number** field above.</p>
                    </div>
                  )}
                </div>

                {/* Amazon Affiliate Buy Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-400" />
                    <p className="text-xs font-black uppercase tracking-wider text-amber-400">Need a Premium Biometric Machine?</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-300 font-bold leading-normal">
                        Get the recommended <span className="text-white font-black">ZKTeco Touchless Face & Fingerprint</span> biometric scanner. Contactless face verification prevents scanner issues for members with sweaty/dry hands.
                      </p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        Recommended • Face + Fingerprint + Card + Password • Inbuilt Battery Backup • 100% Gymix Cloud Compatible
                      </p>
                    </div>

                    <a 
                      href="https://amzn.to/4e7Cqxu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/15 whitespace-nowrap self-stretch sm:self-auto text-center"
                    >
                      Buy on Amazon 🛒
                    </a>
                  </div>
                </div>

                {/* Real-time Hardware Device Simulator Card */}
                {gym?.biometric_device_serial && gym?.biometric_api_key && (
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">Biometric Connectivity Simulator</p>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                      Test instant punch signals by entering a custom Biometric User ID below without installing any physical hardware!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          placeholder="e.g. 105" 
                          value={testBioId}
                          onChange={e => setTestBioId(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSimulateBiometric}
                        disabled={simulatingBio || !testBioId.trim()}
                        className="px-5 py-2.5 bg-[#10B981] hover:bg-[#1bc58c] disabled:opacity-40 text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {simulatingBio ? (
                          <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            Simulate Swipe ⚡
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <button 
                onClick={handleSaveBiometricSettings} 
                disabled={savingBiometricSettings} 
                className="px-6 py-2.5 bg-[#3390ec] hover:bg-[#2b7ad2] disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all"
              >
                {savingBiometricSettings ? 'Saving...' : 'Save Biometric Settings'}
              </button>
            </div>
          </div>
        </Section>

        {/* WhatsApp Automation Gateway */}
        <Section 
          icon={<MessageCircle className="w-5.5 h-5.5 text-emerald-400 fill-emerald-400/10" />}
          title="WhatsApp Automation Gateway" 
          description="Connect your own WhatsApp account via QR code to automate fee alerts, expiry warnings, and walk-in follow-ups in the background."
        >
          <div className="space-y-4">
            {/* Connection Mode Selection Toggle */}
            <div className="flex items-center justify-between p-4.5 rounded-2xl bg-white/[0.01] border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Enable WhatsApp Autopilot Mode</p>
                <p className="text-[10px] text-gray-500 font-medium">
                  {globalSettings.waAutopilotEnabled 
                    ? "🟢 Reminders will send in the background automatically via your linked WhatsApp device." 
                    : "⚪ Reminders open manual click-to-chat web tabs (wa.me) for manual sending."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...globalSettings, waAutopilotEnabled: !globalSettings.waAutopilotEnabled };
                  setGlobalSettings(updated);
                  localStorage.setItem(`gym_settings_${gymId}`, JSON.stringify(updated));
                  showToast(updated.waAutopilotEnabled ? 'WhatsApp Autopilot Mode Enabled!' : 'WhatsApp Manual Mode Activated.');
                }}
                className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer relative flex items-center ${globalSettings.waAutopilotEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
              >
                <span className={`w-5 h-5 bg-white rounded-full shadow-md transition-all absolute ${globalSettings.waAutopilotEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>



            {/* Autopilot Panel (Displays only when Autopilot Toggle is True) */}
            {globalSettings.waAutopilotEnabled && (
              <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-4 animate-in fade-in duration-300">
                
                {/* STATE 1: Disconnected */}
                {waSessionState === 'disconnected' && (
                  <div className="flex flex-col items-center text-center py-6 space-y-4">
                    <div className="w-14 h-14 bg-white/[0.02] border border-white/5 text-gray-500 rounded-2xl flex items-center justify-center shadow-inner">
                      <Smartphone className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">No Connected WhatsApp Device</h4>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed font-medium">
                        Link your phone using a standard WhatsApp Web QR scan to enable background automation. No message fees, 100% direct client delivery.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartWaSession}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
                    >
                      <Scan className="w-4 h-4" />
                      Link WhatsApp Account
                    </button>
                  </div>
                )}

                {/* STATE 2: Connecting (Session Initialization) */}
                {waSessionState === 'connecting' && (
                  <div className="flex flex-col items-center text-center py-10 space-y-4">
                    <div className="relative">
                      <div className="w-14 h-14 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin flex items-center justify-center" />
                      <MessageCircle className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-white animate-pulse">Initializing Security Session</h4>
                      <p className="text-[10px] text-gray-500 font-semibold tracking-wide">
                        Configuring virtual browser instance on cloud node...
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectWa}
                      className="px-4 py-2 mt-2 bg-white/5 hover:bg-white/10 active:scale-95 text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/5 transition-all cursor-pointer"
                    >
                      Cancel & Reset Connection
                    </button>
                  </div>
                )}

                {/* STATE 3: QR Ready (Displaying QR Code Scanner Grid) */}
                {waSessionState === 'qr_ready' && (
                  <div className="flex flex-col items-center text-center py-4 space-y-5">
                    {/* Glowing scanning target grid */}
                    <div className="relative p-3 bg-white rounded-3xl border border-white/10 shadow-2xl shadow-emerald-500/5 group">
                      
                      {/* Interactive CSS Neon Scanning Line */}
                      <div 
                        className="absolute left-3 right-3 h-0.5 bg-emerald-500 shadow-[0_0_8px_#10B981] z-10 animate-scan"
                        style={{
                          animation: 'scan 2.5s linear infinite'
                        }}
                      />
                      
                      {/* CSS Scanner Keyframe Style Tag self-contained */}
                      <style dangerouslySetInnerHTML={{__html: `
                        @keyframes scan {
                          0% { top: 12px; }
                          50% { top: calc(100% - 14px); }
                          100% { top: 12px; }
                        }
                      `}} />

                      {/* Styled QR Code Frame */}
                      <div className="w-40 h-40 bg-[#0f0f0f] flex items-center justify-center p-1 relative overflow-hidden rounded-2xl border border-white/10 select-none">
                        {waQrImage ? (
                          <img src={waQrImage} alt="WhatsApp QR Code" className="w-full h-full object-contain bg-white rounded-xl p-1.5 animate-in fade-in duration-300" />
                        ) : (
                          /* Glowing status loader */
                          <div className="flex flex-col items-center justify-center space-y-2.5 p-4 text-center">
                            <div className="w-9 h-9 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <p className="text-[9px] font-black text-emerald-400 tracking-widest animate-pulse">GENERATING FRESH QR...</p>
                            <p className="text-[8px] text-gray-500 leading-relaxed font-semibold">Please wait, retrieving secure barcode from gateway...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 max-w-sm">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" />
                        QR Code expires in {waCountdown}s
                      </div>
                      <h4 className="text-sm font-extrabold text-white">Scan to Connect Device</h4>
                      <p className="text-[10px] text-gray-400 leading-normal font-semibold">
                        Open WhatsApp on your phone &rarr; Tap Menu or Settings &rarr; Linked Devices &rarr; Scan this QR.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setWaCountdown(45)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/5 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Force Regenerate QR
                    </button>
                  </div>
                )}

                {/* STATE 4: Connected Session */}
                {waSessionState === 'connected' && (
                  <div className="p-4 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                          <MessageCircle className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">WhatsApp Session Linked</h4>
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                          </div>
                          <p className="text-xs font-bold text-[#10B981] font-mono">{globalSettings.waConnectedNumber || 'Linked Device'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setTestPhone('');
                            setShowTestModal(true);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Send Test
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectWa}
                          className="flex-1 sm:flex-none px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                          title="Disconnect WhatsApp Session"
                        >
                          <Power className="w-3.5 h-3.5" />
                          Disconnect
                        </button>
                      </div>
                    </div>

                    {/* Operational metrics dashboard */}
                    <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-white/[0.03] text-[9px] font-bold uppercase tracking-wider text-gray-500">
                      <div className="bg-white/[0.01] rounded-lg p-2.5 text-center">
                        <p className="text-gray-400 text-sm font-black mb-0.5 font-mono">Ready</p>
                        <span>Device Status</span>
                      </div>
                      <div className="bg-white/[0.01] rounded-lg p-2.5 text-center">
                        <p className="text-emerald-400 text-sm font-black mb-0.5 font-mono">100%</p>
                        <span>Success Rate</span>
                      </div>
                      <div className="bg-white/[0.01] rounded-lg p-2.5 text-center">
                        <p className="text-white text-sm font-black mb-0.5 font-mono">0 ms</p>
                        <span>Dispatch Latency</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </Section>

        {/* Global Settings */}
        <Section 
          icon={<SettingsIcon className="w-5 h-5" />}
          title="Global Settings" 
          description="Platform preferences for your gym"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 px-1">Currency Symbol</label>
              <select
                value={globalSettings.currency}
                onChange={e => setGlobalSettings({...globalSettings, currency: e.target.value})}
                className="w-full bg-[#1c1c1c] border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3390ec]/50 transition-all appearance-none"
              >
                <option value="₹">₹ (INR)</option>
                <option value="$">$ (USD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-medium text-gray-400">WhatsApp Template</label>
                <select
                  onChange={(e) => {
                    const template = WA_PRESETS.find(p => p.label === e.target.value)?.text;
                    if (template) setGlobalSettings({...globalSettings, waTemplate: template});
                  }}
                  className="bg-transparent border-none text-[10px] font-bold text-[#3390ec] uppercase tracking-wider cursor-pointer focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>Load Preset</option>
                  {WA_PRESETS.map(preset => (
                    <option key={preset.label} value={preset.label} className="text-black">{preset.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                rows={3}
                value={globalSettings.waTemplate}
                onChange={e => setGlobalSettings({...globalSettings, waTemplate: e.target.value})}
                className="w-full bg-[#1c1c1c] border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#3390ec]/50 transition-all resize-none"
                placeholder="Hello {{name}}, your plan expires on {{date}}."
              />
              <p className="text-[10px] text-gray-500 px-1">Available variables: {'{{name}}'}, {'{{date}}'}, {'{{plan}}'}</p>
            </div>
          </div>
          <div className="pt-2">
            <button onClick={handleSaveGlobalSettings} disabled={savingSettings} className="px-6 py-2 bg-[#3390ec] hover:bg-[#2b7ad2] disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all">
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </Section>

        {/* Security */}
        <Section 
          icon={<ShieldCheck className="w-5 h-5" />}
          title="Security" 
          description="Manage your account password"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Current Password" id="settings-current-pw" type={showPasswords ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Required" />
            <Field label="New Password" id="settings-new-pw" type={showPasswords ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" />
            <Field label="Confirm Password" id="settings-confirm-pw" type={showPasswords ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter password" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowPasswords(!showPasswords)} 
                className="text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPasswords ? 'Hide Password' : 'Show Password'}
              </button>
              <button 
                onClick={handleForgotPassword}
                className="text-xs font-bold text-[#3390ec] hover:text-[#2b7ad2] transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <button onClick={handleChangePassword} disabled={savingPw} className="px-6 py-2 bg-[#3390ec] hover:bg-[#2b7ad2] text-white font-medium rounded-lg text-sm transition-all shadow-lg shadow-[#3390ec]/20">
              {savingPw ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </Section>

        {/* Data Control */}
        <Section 
          icon={<Download className="w-5 h-5" />}
          title="Data Management" 
          description="Export your gym's data to CSV"
        >
          <button onClick={handleExportCSV} disabled={exporting} className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-all border border-white/5">
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export Member Data'}
          </button>
        </Section>

        {/* Support Center */}
        <Section 
          id="support-center"
          icon={<LifeBuoy className="w-5 h-5" />}
          title="Support & Help" 
          description="Contact Super Admin and track your support tickets"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
            {/* Left: Live Support Notice + Create Ticket Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Live Support Notice */}
              <div className="bg-[#3390ec]/5 border border-[#3390ec]/10 rounded-2xl p-5 flex items-start gap-4 transition-all hover:bg-[#3390ec]/[0.07] duration-300">
                <div className="w-10 h-10 rounded-xl bg-[#3390ec]/10 flex items-center justify-center text-[#3390ec] shrink-0 border border-[#3390ec]/20">
                  <LifeBuoy className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Real-Time Support Integration</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">
                    Submit your ticket below. The Support Team will respond promptly, and you will receive instant updates directly inside the <span className="text-[#3390ec] font-bold">Notifications</span> page in your sidebar menu.
                  </p>
                </div>
              </div>

              {/* Create Ticket Form */}
              <form onSubmit={handleSubmitTicket} className="space-y-4 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
                <Field 
                  label="Subject" 
                  id="ticket-subject" 
                  type="text" 
                  placeholder="Brief summary of the issue"
                  value={ticket.subject} 
                  onChange={e => setTicket({...ticket, subject: e.target.value})} 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 px-1">Category</label>
                    <select
                      value={ticket.category}
                      onChange={e => setTicket({...ticket, category: e.target.value})}
                      className="w-full bg-[#1c1c1c] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3390ec]/50 transition-all cursor-pointer"
                    >
                      <option value="other">General Inquiry</option>
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing Issue</option>
                      <option value="feature_request">Feature Request</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 px-1">Priority</label>
                    <select
                      value={ticket.priority}
                      onChange={e => setTicket({...ticket, priority: e.target.value})}
                      className="w-full bg-[#1c1c1c] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3390ec]/50 transition-all cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400 px-1">Description</label>
                  <textarea
                    rows={4}
                    value={ticket.description}
                    onChange={e => setTicket({...ticket, description: e.target.value})}
                    className="w-full bg-[#1c1c1c] border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3390ec]/50 transition-all resize-none font-sans"
                    placeholder="Please describe your issue in detail..."
                  />
                </div>
                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submittingTicket} 
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#3390ec] to-[#2b7ad2] hover:from-[#4aa1fa] hover:to-[#3390ec] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-[#3390ec]/15"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {submittingTicket ? 'Submitting...' : 'Submit Support Ticket'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Ticket History Tracking */}
            <div className="lg:col-span-5 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider px-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Ticket History
              </h4>
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                {loadingTickets ? (
                  <div className="space-y-3">
                    {[1, 2].map(n => (
                      <div key={n} className="bg-white/[0.01] border border-white/5 rounded-xl p-4 animate-pulse space-y-3">
                        <div className="h-3.5 bg-white/10 rounded w-2/3" />
                        <div className="h-2.5 bg-white/5 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : userTickets.length === 0 ? (
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-8 text-center">
                    <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-xs text-gray-500 font-medium">No tickets logged yet</p>
                    <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
                      Your submitted tickets and support team responses will show up here.
                    </p>
                  </div>
                ) : (
                  userTickets.map(t => (
                    <div 
                      key={t.id} 
                      className={`bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl p-4 space-y-3 transition-all duration-300 relative group overflow-hidden ${
                        t.admin_response?.trim() ? 'bg-gradient-to-r from-white/[0.02] to-[#3390ec]/[0.02]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <h5 className="text-xs font-bold text-white group-hover:text-[#3390ec] transition-colors truncate">
                            {t.subject}
                          </h5>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-500">
                              {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="w-1 h-1 bg-white/10 rounded-full" />
                            <span className="text-[10px] text-gray-500 capitalize">{t.category}</span>
                          </div>
                        </div>
                        {/* Status Badges */}
                        {t.status === 'resolved' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                            Resolved
                          </span>
                        ) : t.status === 'in_progress' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#3390ec]/10 text-[#3390ec] border border-[#3390ec]/20 whitespace-nowrap">
                            In Progress
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                            Open
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className={`text-[10px] font-bold ${t.priority === 'high' ? 'text-red-400' : t.priority === 'medium' ? 'text-amber-400' : 'text-gray-500'} capitalize`}>
                          {t.priority} Priority
                        </span>
                        <button 
                          onClick={() => setSelectedUserTicket(t)}
                          className="flex items-center gap-1 text-[10px] font-bold text-[#3390ec] hover:text-[#4aa1fa] transition-colors"
                        >
                          {t.admin_response?.trim() ? 'View Response' : 'View Ticket'}
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Section>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-red-500 font-bold text-lg">Danger Zone</h3>
                <p className="text-red-400/70 text-xs mt-0.5">Irreversible actions for your gym data</p>
              </div>
            </div>
            <button 
              onClick={() => setShowDangerModal(true)} 
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-500/20 whitespace-nowrap"
            >
              Wipe All Data
            </button>
          </div>
        </div>

        {/* Danger Modal */}
        {showDangerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1c1c1c] border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" />
              
              <div className="flex flex-col items-center text-center space-y-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2 border border-red-500/20">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Are you absolutely sure?</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    This action <strong className="text-red-400 font-bold">cannot be undone</strong>. This will permanently delete all your athletes, subscriptions, payments, and notifications.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Type "DELETE" to confirm</label>
                  <input 
                    type="text" 
                    value={deleteConfirm} 
                    onChange={e => setDeleteConfirm(e.target.value)} 
                    placeholder="DELETE" 
                    className="w-full bg-[#121212] border border-red-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-center tracking-[0.2em] font-bold" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => { setShowDangerModal(false); setDeleteConfirm(''); }}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteAllMembers} 
                    disabled={deleting || deleteConfirm !== 'DELETE'} 
                    className="px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-500/20"
                  >
                    {deleting ? 'Erasing...' : 'Wipe Data'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Test Message Modal */}
        {showTestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in animate-duration-200">
            <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0" />
              
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Send Test Message</h3>
                </div>
                <button 
                  onClick={() => setShowTestModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendTestMessage} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Recipient Phone Number</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="e.g. +91 98765 43210" 
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    className="w-full bg-[#121212] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder-gray-600 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Message Content</label>
                  <textarea 
                    rows={3}
                    readOnly
                    value="Hello! This is a test message dispatched from Gymix Autopilot Gateway. Your device linking is fully operational! 🟢🚀"
                    className="w-full bg-[#121212]/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-gray-400 focus:outline-none transition-all resize-none font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowTestModal(false)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={sendingTestMessage} 
                    className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                  >
                    {sendingTestMessage ? (
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        Send Now ⚡
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Plan Editor Modal */}
        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#3390ec]/0 via-[#3390ec] to-[#3390ec]/0" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#3390ec]" />
                  <h3 className="text-lg font-bold text-white">
                    {editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowPlanModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Plan Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Monthly Gold" 
                    className="w-full bg-[#121212] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3390ec]/50 transition-all placeholder-gray-600"
                    value={planForm.name}
                    onChange={e => setPlanForm({...planForm, name: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Duration (Days)</label>
                    <input 
                      type="number" 
                      placeholder="30" 
                      className="w-full bg-[#121212] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3390ec]/50 transition-all placeholder-gray-600"
                      value={planForm.duration_days}
                      onChange={e => setPlanForm({...planForm, duration_days: parseInt(e.target.value) || ''})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Price (₹)</label>
                    <input 
                      type="number" 
                      placeholder="Price" 
                      className="w-full bg-[#121212] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3390ec]/50 transition-all placeholder-gray-600"
                      value={planForm.price}
                      onChange={e => setPlanForm({...planForm, price: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button 
                    onClick={() => setShowPlanModal(false)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSavePlan} 
                    disabled={loadingPlans} 
                    className="px-4 py-3 bg-gradient-to-r from-[#3390ec] to-[#2b7ad2] hover:from-[#4aa1fa] hover:to-[#3390ec] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#3390ec]/20"
                  >
                    {loadingPlans ? 'Saving...' : 'Save Plan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Support Ticket Details Modal */}
        {selectedUserTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 relative overflow-hidden flex flex-col max-h-[90vh]">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#3390ec]/0 via-[#3390ec] to-[#3390ec]/0" />
              
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-[#3390ec]" />
                  <h3 className="text-lg font-bold text-white">Support Ticket Details</h3>
                </div>
                <button 
                  onClick={() => setSelectedUserTicket(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable conversation content */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                  <div>
                    <span className="text-gray-500 block">Category</span>
                    <span className="text-white font-semibold capitalize">{selectedUserTicket.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Priority</span>
                    <span className={`font-semibold capitalize ${selectedUserTicket.priority === 'high' ? 'text-red-400' : selectedUserTicket.priority === 'medium' ? 'text-amber-400' : 'text-gray-300'}`}>
                      {selectedUserTicket.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Status</span>
                    {selectedUserTicket.status === 'resolved' ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Resolved
                      </span>
                    ) : selectedUserTicket.status === 'in_progress' ? (
                      <span className="text-[#3390ec] font-semibold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3390ec]" /> In Progress
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Open
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 block">Created On</span>
                    <span className="text-white font-medium">
                      {new Date(selectedUserTicket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Ticket Query */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Your Query</h4>
                  <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 space-y-3">
                    <h5 className="text-white font-bold text-sm leading-snug">{selectedUserTicket.subject}</h5>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {selectedUserTicket.description}
                    </p>
                  </div>
                </div>

                {/* Team Response / Timeline */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#3390ec] uppercase tracking-wider px-1 flex items-center gap-1">
                    <CornerDownRight className="w-4 h-4 shrink-0" />
                    Response from Support Team
                  </h4>
                  {selectedUserTicket.admin_response?.trim() ? (
                    <div className="bg-[#3390ec]/5 border border-[#3390ec]/15 rounded-2xl p-5 space-y-4 transition-all hover:bg-[#3390ec]/[0.08] relative overflow-hidden">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#3390ec] flex items-center justify-center text-white text-xs font-bold font-mono shrink-0">
                          S
                        </div>
                        <div>
                           <span className="text-xs font-bold text-white block">Gymix Support Agent</span>
                          <span className="text-[10px] text-gray-500">
                            Replied on {new Date(selectedUserTicket.resolved_at || selectedUserTicket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-wrap pl-1 border-l-2 border-[#3390ec]/30">
                        {selectedUserTicket.admin_response}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-8 text-center">
                      <Clock className="w-8 h-8 text-gray-600 mx-auto mb-3 animate-spin duration-3000" />
                      <p className="text-xs text-gray-400 font-semibold">Under Active Review</p>
                      <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
                        Our engineering and support team is checking this ticket. We appreciate your patience and will respond with details as soon as possible.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Close footer button */}
              <div className="pt-4 border-t border-white/5 flex justify-end shrink-0">
                <button 
                  onClick={() => setSelectedUserTicket(null)}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs transition-all border border-white/5"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <div className="bg-[#212121] border border-white/5 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-white/5 flex items-center justify-center text-gray-500">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold">Signed in as</h4>
              <p className="text-gray-500 text-xs">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut} 
            disabled={signingOut}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-white rounded-lg text-sm font-medium transition-all border border-white/5"
          >
            {signingOut ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <LogOut className="w-4 h-4" />}
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
      </>
      )}

      <ConfirmModal
        open={!!deletePlanId}
        title="Delete Membership Plan"
        message="Are you sure you want to delete this plan?"
        confirmLabel="Delete"
        loading={deletingPlan}
        onConfirm={executeDeletePlan}
        onCancel={() => setDeletePlanId(null)}
      />
    </div>
  );
}
