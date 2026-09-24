export default function StatCard({ title, value, subtitle, icon, trend }) {
  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/30 border border-slate-200/80 dark:border-white/[0.05] hover:border-violet-500/30 transition-all flex flex-col justify-between text-left group shadow-xs">
      
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-slate-400 dark:text-zinc-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          {icon}
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            trend.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
            trend.startsWith('-') ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' : 
            'text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'
          }`}>
            {trend}
          </span>
        )}
      </div>
      
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{value}</h3>
        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 line-clamp-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
