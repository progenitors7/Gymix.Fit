import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Trash2, 
  AlertTriangle, 
  AlertCircle,
  CreditCard,
  User,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const [updateConfig, setUpdateConfig] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(0);

  useEffect(() => {
    try {
      const cachedConfig = localStorage.getItem('gymix_latest_version_config');
      const cachedCurrent = localStorage.getItem('gymix_current_version_code');
      if (cachedConfig) {
        setUpdateConfig(JSON.parse(cachedConfig));
      }
      if (cachedCurrent) {
        setCurrentVersion(parseInt(cachedCurrent, 10));
      }
    } catch (e) {
      console.error('[NotificationsPage] Error reading cached update config:', e);
    }
  }, []);

  const hasUpdate = updateConfig && currentVersion > 0 && currentVersion < updateConfig.latest_version_code;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'payments') return n.type?.includes('payment');
    if (filter === 'memberships') return n.type?.includes('membership') || n.type?.includes('trial');
    if (filter === 'support') {
      return n.type === 'system_message' && (n.title?.toLowerCase().includes('support') || n.message?.toLowerCase().includes('support'));
    }
    if (filter === 'announcements') {
      const isSupport = n.title?.toLowerCase().includes('support') || n.message?.toLowerCase().includes('support');
      return n.type === 'system_broadcast' || (n.type === 'system_message' && !isSupport);
    }
    return true;
  });

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'membership_expiring':
        return { 
          icon: <Clock className="w-5 h-5" />, 
          color: 'text-amber-500', 
          bg: 'bg-amber-500/10', 
          label: 'Expiring' 
        };
      case 'trial_ending':
        return { 
          icon: <Clock className="w-5 h-5" />, 
          color: 'text-orange-500', 
          bg: 'bg-orange-500/10', 
          label: 'Trial Ending' 
        };
      case 'trial_expired':
        return { 
          icon: <AlertCircle className="w-5 h-5" />, 
          color: 'text-red-500', 
          bg: 'bg-red-500/10', 
          label: 'Trial Expired' 
        };
      case 'membership_expired':
        return { 
          icon: <AlertCircle className="w-5 h-5" />, 
          color: 'text-red-500', 
          bg: 'bg-red-500/10', 
          label: 'Expired'
        };
      case 'payment_due':
        return { 
          icon: <CreditCard className="w-5 h-5" />, 
          color: 'text-[#3390ec]', 
          bg: 'bg-[#3390ec]/10', 
          label: 'Pending'
        };
      case 'payment_overdue':
        return { 
          icon: <AlertTriangle className="w-5 h-5" />, 
          color: 'text-red-500', 
          bg: 'bg-red-500/10', 
          label: 'Overdue'
        };
      case 'system_broadcast':
        return { 
          icon: <Sparkles className="w-5 h-5" />, 
          color: 'text-indigo-500', 
          bg: 'bg-indigo-500/10', 
          label: 'Announcement'
        };
      case 'system_message':
        return { 
          icon: <Sparkles className="w-5 h-5" />, 
          color: 'text-purple-500', 
          bg: 'bg-purple-500/10', 
          label: 'System Update'
        };
      default:
        return { 
          icon: <Bell className="w-5 h-5" />, 
          color: 'text-gray-400', 
          bg: 'bg-white/5', 
          label: 'System'
        };
    }
  };

  const getActionLink = (n) => {
    if (n.type === 'system_broadcast') return '/dashboard';
    if (n.type === 'system_message' || n.title?.toLowerCase().includes('support') || n.message?.toLowerCase().includes('support')) {
      return n.reference_id ? `/settings?ticketId=${n.reference_id}#support` : '/settings#support';
    }
    if (n.type?.includes('payment')) return '/payments';
    return '/subscriptions';
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-2 border-[#3390ec]/20 border-t-[#3390ec] rounded-full animate-spin" />
        <p className="text-gray-500 text-sm mt-4">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg bg-[#212121] border border-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
        </div>

        <button 
          onClick={markAllAsRead}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5 transition-all text-sm font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-[#3390ec]" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#212121] border border-white/5 rounded-xl">
        {['all', 'unread', 'payments', 'memberships', 'support', 'announcements'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f 
                ? 'bg-[#3390ec] text-white' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {hasUpdate && (
          <div className="bg-[#1A1F2B] border border-[#863BFF]/30 rounded-2xl p-5 shadow-lg shadow-[#863BFF]/5 relative overflow-hidden mb-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#863BFF]/5 blur-[40px] rounded-full pointer-events-none" />
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#863BFF]/10 text-[#863BFF]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
                    🚀 New Update Available!
                    <span className="px-2 py-0.5 rounded-full bg-[#863BFF]/20 text-[10px] font-bold text-[#A855F7] border border-[#863BFF]/30">
                      v{updateConfig.latest_version_name}
                    </span>
                  </h4>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap">System Alert</span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm mb-4 leading-relaxed">
                  A new version of Gymix is available on the Google Play Store. Update now to experience new updates, bug fixes, and performance enhancements.
                </p>
                <button
                  onClick={() => window.open(updateConfig.play_store_url || 'market://details?id=com.gymix.fit', '_system')}
                  className="px-4 py-2 bg-[#863BFF] hover:bg-[#722EE5] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-[#863BFF]/15 cursor-pointer"
                >
                  <span>Update Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredNotifications.length === 0 ? (
          <div className="bg-[#212121] border border-white/5 rounded-xl p-16 text-center">
             <div className="w-16 h-16 bg-[#1c1c1c] rounded-2xl flex items-center justify-center mx-auto mb-6">
               <Sparkles className="w-8 h-8 text-gray-600" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">All caught up!</h3>
             <p className="text-gray-400 text-sm">No notifications found in this category.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredNotifications.map(n => {
              const styles = getNotificationStyles(n.type);
              
              return (
                <div 
                  key={n.id} 
                  className={`bg-[#212121] border rounded-xl p-5 transition-all ${
                    n.is_read 
                      ? 'border-white/5 opacity-60' 
                      : 'border-[#3390ec]/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${styles.bg} ${styles.color}`}>
                      {styles.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className={`font-bold text-sm sm:text-base tracking-tight ${n.is_read ? 'text-gray-400' : 'text-white'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {(() => {
                            const d = new Date(n.created_at);
                            return n.created_at && !isNaN(d.getTime()) ? formatDistanceToNow(d, { addSuffix: true }) : 'Just now';
                          })()}
                        </span>
                      </div>
                      
                      <p className="text-gray-400 text-xs sm:text-sm mb-4 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        {!n.is_read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="text-[11px] font-bold text-[#3390ec] hover:underline flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Acknowledge
                          </button>
                        )}
                        <Link 
                          to={getActionLink(n)} 
                          className="text-[11px] font-bold text-gray-400 hover:text-white flex items-center gap-1"
                        >
                          View Details
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {!n.is_read && (
                      <div className="w-2 h-2 bg-[#3390ec] rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
