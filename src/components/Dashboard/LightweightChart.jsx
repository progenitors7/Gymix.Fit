import { motion } from 'framer-motion';

export default function LightweightChart({ data, height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-[#94A3B8] text-sm" style={{ height }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 100); // Ensure at least some scale
  
  return (
    <div className="flex items-end gap-3 sm:gap-4 w-full pt-4 h-full">
      {data.map((item, index) => {
        const heightPercent = `${(item.value / maxValue) * 100}%`;
        return (
          <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
            {/* Tooltip on hover */}
            <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-[#1A1F2B] text-white text-xs py-1.5 px-3 rounded-lg pointer-events-none transition-all duration-200 transform group-hover:-translate-y-1 whitespace-nowrap z-20 shadow-xl border border-white/10 font-bold">
              ₹{item.value.toLocaleString()}
            </div>
            
            {/* Bar */}
            <div className="w-full flex justify-center items-end h-[calc(100%-24px)] relative">
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: heightPercent, opacity: 1 }}
                transition={{ duration: 0.8, delay: index * 0.1, type: "spring", stiffness: 100 }}
                className="w-full max-w-[40px] bg-gradient-to-t from-[#3B82F6]/20 to-[#3B82F6] rounded-t-xl relative overflow-hidden group-hover:from-[#2563EB]/40 group-hover:to-[#60A5FA] transition-colors"
                style={{ minHeight: '8px' }}
              >
                {/* Glowing top edge */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/40 rounded-t-xl" />
              </motion.div>
            </div>
            
            {/* Label */}
            <span className="text-[11px] font-semibold text-[#94A3B8] mt-3 truncate w-full text-center group-hover:text-[#F8FAFC] transition-colors">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
