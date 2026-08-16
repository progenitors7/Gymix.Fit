import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowDown, RefreshCw, Check } from 'lucide-react'

const PULL_THRESHOLD = 65
const MAX_PULL = 110
const DAMPENING = 0.45

export default function PullToRefresh({ onRefresh, children, className = '' }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)

  const startYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const containerRef = useRef(null)

  const handleTouchStart = (e) => {
    if (isRefreshing) return
    const touch = e.touches[0]
    
    // Find the closest scrollable container or check window scroll
    let isAtTop = window.scrollY <= 0
    if (containerRef.current) {
      let el = containerRef.current
      while (el && el !== document.body) {
        if (el.scrollTop > 0) {
          isAtTop = false
          break
        }
        el = el.parentElement
      }
    }

    if (isAtTop) {
      startYRef.current = touch.clientY
      isDraggingRef.current = true
    }
  }

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || isRefreshing) return
    const touch = e.touches[0]
    const deltaY = touch.clientY - startYRef.current

    if (deltaY > 0) {
      // Check if we are still at top of scroll
      let isAtTop = window.scrollY <= 0
      if (containerRef.current) {
        let el = containerRef.current
        while (el && el !== document.body) {
          if (el.scrollTop > 0) {
            isAtTop = false
            break
          }
          el = el.parentElement
        }
      }

      if (isAtTop) {
        const pull = Math.min(MAX_PULL, deltaY * DAMPENING)
        setPullDistance(pull)

        // Light haptic feedback when crossing threshold
        if (pull >= PULL_THRESHOLD && pull - deltaY * DAMPENING < 1) {
          if (navigator.vibrate) {
            try { navigator.vibrate(12) } catch {}
          }
        }
      } else {
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }

  const handleTouchEnd = async () => {
    if (!isDraggingRef.current || isRefreshing) return
    isDraggingRef.current = false

    if (pullDistance >= PULL_THRESHOLD && onRefresh) {
      setIsRefreshing(true)
      setPullDistance(PULL_THRESHOLD * 0.8)

      try {
        if (navigator.vibrate) {
          try { navigator.vibrate([10, 30, 10]) } catch {}
        }
        await Promise.resolve(onRefresh())
        setJustCompleted(true)
        setTimeout(() => {
          setJustCompleted(false)
          setIsRefreshing(false)
          setPullDistance(0)
        }, 500)
      } catch (err) {
        console.error('Pull to refresh error:', err)
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD)
  const isReadyToRelease = pullDistance >= PULL_THRESHOLD

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative ${className}`}
    >
      {/* Pull Indicator Badge */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 flex justify-center z-30 transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance > 0 || isRefreshing ? pullDistance - 45 : -60}px)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0
        }}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#151922]/95 border border-emerald-500/30 text-white shadow-xl shadow-black/40 backdrop-blur-md">
          {justCompleted ? (
            <>
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </div>
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                Updated!
              </span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                Syncing Data...
              </span>
            </>
          ) : (
            <>
              <div
                className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-slate-300 transition-transform duration-150"
                style={{
                  transform: `rotate(${isReadyToRelease ? 180 : progress * 180}deg)`,
                  color: isReadyToRelease ? '#34D399' : '#94A3B8'
                }}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[11px] font-black uppercase tracking-wider ${isReadyToRelease ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isReadyToRelease ? 'Release to Refresh' : 'Pull to Refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Content with smooth slide down when pulled */}
      <div
        className="transition-transform duration-150 ease-out"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance * 0.35}px)` : 'none'
        }}
      >
        {children}
      </div>
    </div>
  )
}
