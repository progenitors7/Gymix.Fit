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

const isValidDate = (d) => d instanceof Date && !isNaN(d);

export default function RecentActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center h-full flex flex-col items-center justify-center relative overflow-hidden group">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4 border border-white/10 shadow-inner relative z-10">
          <History className="w-5 h-5 text-[#94A3B8]" />
        </div>
        <p className="text-[#64748B] text-xs font-semibold uppercase tracking-widest relative z-10">No recent activity yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-6 h-full relative overflow-hidden group">
      
      <h3 className="text-[#F8FAFC] font-extrabold text-lg mb-8 flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/20 shadow-inner">
          <Activity className="w-5 h-5 text-[#3B82F6]" />
        </div>
        Recent Activity
      </h3>

      <div className="space-y-6 relative z-10">
        {activities.map((activity, index) => {
          let Icon = Bell;
          let iconColor = "bg-[#64748B]/10 text-[#94A3B8] border-[#64748B]/20";
          let highlightColor = "group-hover:text-[#94A3B8]";
          
          if (activity.type === 'member_joined') {
            Icon = UserPlus;
            iconColor = "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20";
            highlightColor = "group-hover/item:text-[#22C55E]";
          } else if (activity.type === 'payment_received') {
            Icon = CreditCard;
            iconColor = "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20";
            highlightColor = "group-hover/item:text-[#3B82F6]";
          } else if (activity.type === 'subscription_updated') {
            Icon = TrendingUp;
            iconColor = "bg-[#8B5CF6]/10 text-[#A78BFA] border-[#8B5CF6]/20";
            highlightColor = "group-hover/item:text-[#A78BFA]";
          }

          return (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={`${activity.type}-${activity.id}-${index}`} 
              className="group/item flex gap-4 relative"
            >
              {/* Timeline Connector */}
              {index !== activities.length - 1 && (
                <div className="absolute left-[20px] top-10 bottom-[-24px] w-px bg-white/5 group-hover/item:bg-white/10 transition-colors" />
              )}
              
              {/* Icon Container */}
              <div className="flex-shrink-0 relative">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl border shadow-sm transition-all duration-300 ${iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 pt-0.5 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-[14px] font-bold text-[#F8FAFC] transition-colors ${highlightColor}`}>{activity.title}</p>
                   <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest whitespace-nowrap pt-1">
                    {(() => {
                      const d = new Date(activity.date);
                      return activity.date && !isNaN(d.getTime()) ? formatDistanceToNow(d, { addSuffix: true }) : 'Recently';
                    })()}
                  </span>
                </div>
                <p className="text-[12px] text-[#94A3B8] font-medium mt-1 leading-relaxed">{activity.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

