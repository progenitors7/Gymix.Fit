import { useState, useEffect } from 'react';
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
          color: 'text-amber-500', 
          bg: 'bg-amber-50 dark:bg-amber-950/40', 
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
          color: 'text-emerald-500', 
          bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
          label: 'Announcement'
        };
      case 'system_message':
        return { 
          icon: <Sparkles className="w-5 h-5" />, 
          color: 'text-emerald-500', 
          bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
          label: 'System Update'
        };
      default:
        return { 
          icon: <Bell className="w-5 h-5" />, 
          color: 'text-slate-400', 
          bg: 'bg-slate-100 dark:bg-zinc-800', 
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
        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-zinc-400 text-xs mt-4 font-medium">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Notifications</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">Broadcasts, alerts, and system updates</p>
          </div>
        </div>

        <button 
          onClick={markAllAsRead}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl border border-slate-200/80 dark:border-zinc-700 transition-all text-xs font-semibold cursor-pointer shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Control Bar (Segmented Tabs) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-xl">
        {['all', 'unread', 'payments', 'memberships', 'support', 'announcements'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === f 
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-zinc-700/60' 
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {hasUpdate && (
          <div className="bg-white dark:bg-zinc-900 border border-emerald-500/20 rounded-2xl p-5 shadow-xs relative overflow-hidden mb-2">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    New Update Available
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      v{updateConfig.latest_version_name}
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">System Alert</span>
                </div>
                <p className="text-slate-600 dark:text-zinc-300 text-xs sm:text-sm mb-4 leading-relaxed font-medium">
                  A new version of Gymix is available. Update now to experience new updates, bug fixes, and performance enhancements.
                </p>
                <button
                  onClick={() => window.open(updateConfig.play_store_url || 'market://details?id=com.gymix.fit', '_system')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span>Update Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-14 text-center shadow-xs">
             <div className="w-14 h-14 bg-slate-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-zinc-700">
               <Sparkles className="w-7 h-7 text-slate-400 dark:text-zinc-500" />
             </div>
             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">All caught up!</h3>
             <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">No notifications found in this category.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredNotifications.map(n => {
              const styles = getNotificationStyles(n.type);
              
              return (
                <div 
                  key={n.id} 
                  className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 sm:p-5 transition-all shadow-xs ${
                    n.is_read 
                      ? 'border-slate-200/80 dark:border-zinc-800 opacity-70' 
                      : 'border-slate-300 dark:border-zinc-700 ring-1 ring-emerald-500/10'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${styles.bg} ${styles.color}`}>
                      {styles.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className={`font-semibold text-sm tracking-tight ${n.is_read ? 'text-slate-600 dark:text-zinc-400' : 'text-slate-900 dark:text-white'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                          {(() => {
                            const d = new Date(n.created_at);
                            return n.created_at && !isNaN(d.getTime()) ? formatDistanceToNow(d, { addSuffix: true }) : 'Just now';
                          })()}
                        </span>
                      </div>
                      
                      <p className="text-slate-500 dark:text-zinc-400 text-xs mb-3 leading-relaxed line-clamp-2 font-medium">
                        {n.message}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        {!n.is_read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Acknowledge
                          </button>
                        )}
                        <Link 
                          to={getActionLink(n)} 
                          className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          View Details
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {!n.is_read && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 mt-1.5" />
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
