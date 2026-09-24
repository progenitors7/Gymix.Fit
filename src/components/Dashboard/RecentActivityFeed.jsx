import { formatDistanceToNow } from 'date-fns';
import {
  UserPlus,
  CreditCard,
  Bell,
  Clock,
  History,
  TrendingUp,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function RecentActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-center h-full flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-3 border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500">
          <History className="w-5 h-5" />
        </div>
        <p className="text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">No recent activity yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-zinc-900/30 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4.5 h-full text-left shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-violet-500" />
        <div>
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm tracking-tight">
            Recent Activity
          </h3>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          let Icon = Bell;
          let iconColor = "text-slate-400 dark:text-zinc-500";

          if (activity.type === 'member_joined') {
            Icon = UserPlus;
            iconColor = "text-violet-500";
          } else if (activity.type === 'payment_received') {
            Icon = CreditCard;
            iconColor = "text-emerald-500";
          } else if (activity.type === 'subscription_updated') {
            Icon = TrendingUp;
            iconColor = "text-indigo-500";
          }

          return (
            <div
              key={`${activity.type}-${activity.id}-${index}`}
              className="group/item flex items-start gap-3 relative"
            >
              {/* Standalone Naked Icon */}
              <div className="shrink-0 mt-0.5">
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">{activity.title}</p>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {(() => {
                      const d = new Date(activity.date);
                      return activity.date && !isNaN(d.getTime()) ? formatDistanceToNow(d, { addSuffix: true }) : 'Recently';
                    })()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5 leading-relaxed">{activity.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
