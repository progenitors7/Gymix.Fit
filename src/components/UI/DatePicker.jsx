import React, { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DatePicker({ value, onChange, label, placeholder = 'Select date', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const [isBelow, setIsBelow] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth >= 640 && containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dynamic boundaries to place dropdown above the input if it lies near the viewport bottom on desktop
  useEffect(() => {
    if (!isOpen) return;
    const checkPosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setIsBelow(rect.bottom > window.innerHeight - 360);
      }
    };
    checkPosition();
    window.addEventListener('resize', checkPosition);
    window.addEventListener('scroll', checkPosition, true);
    return () => {
      window.removeEventListener('resize', checkPosition);
      window.removeEventListener('scroll', checkPosition, true);
    };
  }, [isOpen]);

  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDateClick = (day) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const defaultTriggerCls = 'w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-violet-500 transition-colors cursor-pointer flex items-center group shadow-xs';

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={className || defaultTriggerCls}
      >
        <CalendarIcon className={`absolute left-3.5 w-4 h-4 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors ${isOpen ? 'text-violet-600 dark:text-violet-400' : ''}`} />
        <span className={value ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500'}>
          {value ? format(new Date(value), 'PPP') : placeholder}
        </span>
      </div>

      <AnimatePresence>
        {isOpen && (
          /* Mobile backdrop container (fixed overlay) / Desktop wrapper (relative layout alignment) */
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:bg-transparent sm:backdrop-blur-none sm:p-0 sm:absolute sm:inset-auto sm:z-[150] sm:block">
            
            {/* Click-to-close overlay for mobile */}
            <div 
              className="absolute inset-0 sm:hidden" 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(false); }} 
            />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 4, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative z-10 w-[290px] xs:w-[320px] p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl sm:absolute sm:z-[150] sm:left-0 sm:md:left-auto sm:md:right-0 sm:mt-2"
              style={{ 
                // Dynamically offset dropdown vertical alignments strictly on desktop widths
                bottom: window.innerWidth >= 640 && isBelow ? '100%' : 'auto',
                marginBottom: window.innerWidth >= 640 && isBelow ? '1.5rem' : '0'
              }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h4 className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm tracking-tight">
                  {format(viewDate, 'MMMM yyyy')}
                </h4>
                <div className="flex gap-1">
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewDate(subMonths(viewDate, 1)); }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewDate(addMonths(viewDate, 1)); }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1.5">
                {days.map(day => (
                  <div key={day} className="text-center text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const isSelected = value && isSameDay(day, new Date(value));
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDateClick(day); }}
                      className={`
                        aspect-square flex items-center justify-center text-xs font-semibold rounded-lg transition-colors cursor-pointer
                        ${!isCurrentMonth ? 'text-slate-300 dark:text-zinc-700' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'}
                        ${isSelected ? '!bg-violet-600 !text-white shadow-xs' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex justify-center">
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDateClick(new Date()); }}
                  className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline transition-colors cursor-pointer"
                >
                  Set Today
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
