export default function StatCard({ title, value, subtitle, icon, colorClass, trend }) {
  const colors = {
    emerald: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20',
    sky: 'text-[#0EA5E9] bg-[#0EA5E9]/10 border-[#0EA5E9]/20',
    indigo: 'text-[#6366F1] bg-[#6366F1]/10 border-[#6366F1]/20',
    amber: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20',
    rose: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20',
    slate: 'text-[#94A3B8] bg-[#94A3B8]/10 border-[#94A3B8]/20',
    primary: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20'
  };

  const selectedColor = colors[colorClass] || colors.slate;

  return (
    <div className="p-6 rounded-3xl glass-card flex flex-col h-full group relative overflow-hidden">
      
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-300 ${selectedColor}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm ${
            trend.startsWith('+') ? 'text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20' : 
            trend.startsWith('-') ? 'text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20' : 
            'text-[#94A3B8] bg-[#94A3B8]/10 border border-[#94A3B8]/20'
          }`}>
            {trend}
          </span>
        )}
      </div>
      
      <div className="mt-auto relative z-10">
        <h3 className="text-3xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">{value}</h3>
        <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">{title}</p>
        {subtitle && <p className="text-xs text-[#64748B] font-medium mt-1.5">{subtitle}</p>}
      </div>
    </div>
  );
}

