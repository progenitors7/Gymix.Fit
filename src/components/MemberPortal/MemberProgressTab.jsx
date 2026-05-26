import { useState, useMemo } from 'react'
import { Sparkles, Send, Copy, X, Check, Trash2, Camera, Upload, Building, Clock, Activity, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Logo from '../UI/Logo'

export default function MemberProgressTab({
  profile,
  membership,
  streakCount,
  progressLogs,
  progressLoading,
  fetchProgressLogs
}) {
  // Form states
  const [newLogType, setNewLogType] = useState('PR') // 'PR' or 'BODYWEIGHT'
  const [newExerciseName, setNewExerciseName] = useState('Bench Press')
  const [newValue, setNewValue] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [loggingProgress, setLoggingProgress] = useState(false)

  // Share modal states
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [activeShareLog, setActiveShareLog] = useState(null)
  const [shareTheme, setShareTheme] = useState('cyber')

  // Calculate top PR values for lifting cards
  const prValues = useMemo(() => {
    const prs = {
      'Bench Press': 0,
      'Squat': 0,
      'Deadlift': 0,
      'Body Weight': 0
    }
    
    progressLogs.forEach(log => {
      if (log.log_type === 'PR') {
        const name = log.exercise_name
        if (prs[name] !== undefined) {
          prs[name] = Math.max(prs[name], parseFloat(log.value))
        } else {
          prs[name] = Math.max(prs[name] || 0, parseFloat(log.value))
        }
      } else if (log.log_type === 'BODYWEIGHT') {
        if (prs['Body Weight'] === 0) {
          prs['Body Weight'] = parseFloat(log.value)
        }
      }
    })
    
    return prs
  }, [progressLogs])

  // Handle adding progress logs
  const handleAddProgressLog = async (e) => {
    e.preventDefault()
    if (!membership) return
    setLoggingProgress(true)
    try {
      const { error } = await supabase
        .from('member_progress_logs')
        .insert({
          member_id: membership.id,
          log_type: newLogType === 'PR' ? 'pr' : 'weight',
          exercise_name: newLogType === 'BODYWEIGHT' ? 'Body Weight' : newExerciseName,
          value: parseFloat(newValue),
          notes: newNotes.trim() || null,
          recorded_at: new Date().toISOString()
        })
      
      if (error) throw error
      setNewValue('')
      setNewNotes('')
      await fetchProgressLogs(membership.id)
      alert('Progress logged successfully! 💪')
    } catch (err) {
      console.error('Error adding progress log:', err)
      alert(err.message || 'Failed to save progress entry.')
    } finally {
      setLoggingProgress(false)
    }
  }

  // Dynamic colors and styles for Instagram PR themes (Flat dark card versions)
  const getThemeStyles = (theme) => {
    switch (theme) {
      case 'volcano':
        return {
          bg: 'from-[#140b08] via-[#22100d] to-[#1c0c1e]',
          glow1: 'bg-rose-500/5',
          glow2: 'bg-orange-500/5',
          border: 'border-rose-500/30',
          shadow: 'shadow-lg',
          titleColor: 'text-rose-400',
          statColor: 'text-rose-300',
          gymColor: 'text-orange-400'
        }
      case 'emerald':
        return {
          bg: 'from-[#07130e] via-[#0d2217] to-[#1a0f24]',
          glow1: 'bg-emerald-500/5',
          glow2: 'bg-yellow-500/5',
          border: 'border-emerald-500/30',
          shadow: 'shadow-lg',
          titleColor: 'text-emerald-400',
          statColor: 'text-emerald-300',
          gymColor: 'text-emerald-400'
        }
      case 'cyber':
      default:
        return {
          bg: 'from-[#0c0e17] via-[#121424] to-[#1c111e]',
          glow1: 'bg-blue-500/5',
          glow2: 'bg-[#3B82F6]/5',
          border: 'border-[#3B82F6]/30',
          shadow: 'shadow-lg',
          titleColor: 'text-[#3B82F6]',
          statColor: 'text-[#3B82F6]',
          gymColor: 'text-[#3B82F6]'
        }
    }
  }

  // Helper to generate high-resolution dynamic vertical story poster on HTML5 Canvas
  const generatePosterCanvas = () => {
    if (!activeShareLog) return null
    
    const canvas = document.createElement('canvas')
    canvas.width = 720
    canvas.height = 1280
    const ctx = canvas.getContext('2d')
    
    // Draw background gradient
    const grad = ctx.createLinearGradient(0, 0, 720, 1280)
    if (shareTheme === 'volcano') {
      grad.addColorStop(0, '#120705')
      grad.addColorStop(0.5, '#1e0a07')
      grad.addColorStop(1, '#140616')
    } else if (shareTheme === 'emerald') {
      grad.addColorStop(0, '#040d0a')
      grad.addColorStop(0.5, '#081a11')
      grad.addColorStop(1, '#12091a')
    } else {
      grad.addColorStop(0, '#07080f')
      grad.addColorStop(0.5, '#0c0d1b')
      grad.addColorStop(1, '#150a18')
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 720, 1280)
    
    // Radial glowing backgrounds
    const themeStyle = getThemeStyles(shareTheme)
    const radial1 = ctx.createRadialGradient(100, 200, 0, 100, 200, 500)
    radial1.addColorStop(0, themeStyle.glow1.replace('0.05', '0.2'))
    radial1.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = radial1
    ctx.fillRect(0, 0, 720, 1280)

    const radial2 = ctx.createRadialGradient(620, 1080, 0, 620, 1080, 500)
    radial2.addColorStop(0, themeStyle.glow2.replace('0.05', '0.2'))
    radial2.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = radial2
    ctx.fillRect(0, 0, 720, 1280)
    
    // Central Panel (Flat border styling)
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 2
    
    const x = 70, y = 140, w = 580, h = 960, r = 48
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    
    // Draw Gymix Logo Symbol
    ctx.save()
    ctx.translate(110, 175)
    ctx.scale(0.7, 0.7)
    const logoGrad = ctx.createLinearGradient(0, 0, 48, 46)
    if (shareTheme === 'volcano') {
      logoGrad.addColorStop(0, '#EF4444')
      logoGrad.addColorStop(1, '#F59E0B')
    } else if (shareTheme === 'emerald') {
      logoGrad.addColorStop(0, '#10B981')
      logoGrad.addColorStop(1, '#34D399')
    } else {
      logoGrad.addColorStop(0, '#3B82F6')
      logoGrad.addColorStop(1, '#60A5FA')
    }
    ctx.fillStyle = logoGrad
    ctx.fill(new Path2D("M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"))
    ctx.restore()

    // Branding text
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 italic 26px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Gymix', 155, 202)
    
    ctx.fillStyle = '#64748B'
    ctx.font = '900 11px sans-serif'
    ctx.fillText('ATHLETE TERMINAL', 155, 222)
    
    // Verified Stamp
    ctx.fillStyle = 'rgba(16, 185, 129, 0.05)'
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)'
    ctx.lineWidth = 1.5
    const bX = 440, bY = 178, bW = 170, bH = 40, bR = 20
    ctx.beginPath()
    ctx.moveTo(bX + bR, bY)
    ctx.lineTo(bX + bW - bR, bY)
    ctx.quadraticCurveTo(bX + bW, bY, bX + bW, bY + bR)
    ctx.lineTo(bX + bW, bY + bH - bR)
    ctx.quadraticCurveTo(bX + bW, bY + bH, bX + bW - bR, bY + bH)
    ctx.lineTo(bX + bR, bY + bH)
    ctx.quadraticCurveTo(bX, bY + bH, bX, bY + bH - bR)
    ctx.lineTo(bX, bY + bR)
    ctx.quadraticCurveTo(bX, bY, bX + bR, bY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    ctx.fillStyle = '#10B981'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('✓ Gymix Verified', bX + bW / 2, bY + 25)
    
    // PR Content Type Capsule
    const prTitle = activeShareLog.log_type === 'PR' ? 'NEW PERSONAL RECORD' : 'BODY WEIGHT UPDATE'
    ctx.font = '900 13px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.textAlign = 'center'
    const tW = ctx.measureText(prTitle).width + 30
    const tH = 30, tX = 360 - tW / 2, tY = 410, tR = 15
    ctx.beginPath()
    ctx.moveTo(tX + tR, tY)
    ctx.lineTo(tX + tW - tR, tY)
    ctx.quadraticCurveTo(tX + tW, tY, tX + tW, tY + tR)
    ctx.lineTo(tX + tW, tY + tH - tR)
    ctx.quadraticCurveTo(tX + tW, tY + tH, tX + tW - tR, tY + tH)
    ctx.lineTo(tX + tR, tY + tH)
    ctx.quadraticCurveTo(tX, tY + tH, tX, tY + tH - tR)
    ctx.lineTo(tX, tY + tR)
    ctx.quadraticCurveTo(tX, tY, tX + tR, tY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    ctx.fillStyle = '#94A3B8'
    ctx.fillText(prTitle, 360, 429)
    
    // Exercise Name
    ctx.save()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 italic 42px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(activeShareLog.exercise_name.toUpperCase(), 360, 495)
    ctx.restore()
    
    // Main PR value
    const valStr = `${activeShareLog.value}`
    ctx.save()
    ctx.font = '900 italic 136px sans-serif'
    const valWidth = ctx.measureText(valStr).width
    
    ctx.font = '900 italic 36px sans-serif'
    const unitWidth = ctx.measureText(' kg').width
    
    const totalWidth = valWidth + unitWidth
    const startX = 360 - totalWidth / 2
    
    ctx.textAlign = 'left'
    ctx.font = '900 italic 136px sans-serif'
    
    // Value text metallic gradient
    const valGrad = ctx.createLinearGradient(startX, 0, startX + valWidth, 0)
    if (shareTheme === 'volcano') {
      valGrad.addColorStop(0, '#FFFFFF')
      valGrad.addColorStop(1, '#EF4444')
    } else if (shareTheme === 'emerald') {
      valGrad.addColorStop(0, '#FFFFFF')
      valGrad.addColorStop(1, '#10B981')
    } else {
      valGrad.addColorStop(0, '#FFFFFF')
      valGrad.addColorStop(1, '#3B82F6')
    }
    ctx.fillStyle = valGrad
    ctx.fillText(valStr, startX, 640)
    ctx.restore()
    
    // kg unit
    ctx.fillStyle = '#64748B'
    ctx.font = '900 italic 36px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(' kg', startX + valWidth, 640)

    if (activeShareLog.notes) {
      // Notes background quote box
      ctx.save()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.01)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 1
      const qW = 440, qH = 50, qX = 360 - qW/2, qY = 705, qR = 12
      ctx.beginPath()
      ctx.moveTo(qX + qR, qY)
      ctx.lineTo(qX + qW - qR, qY)
      ctx.quadraticCurveTo(qX + qW, qY, qX + qW, qY + qR)
      ctx.lineTo(qX + qW, qY + qH - qR)
      ctx.quadraticCurveTo(qX + qW, qY + qH, qX + qW - qR, qY + qH)
      ctx.lineTo(qX + qR, qY + qH)
      ctx.quadraticCurveTo(qX, qY + qH, qX, qY + qH - qR)
      ctx.lineTo(qX, qY + qR)
      ctx.quadraticCurveTo(qX, qY, qX + qR, qY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      ctx.fillStyle = '#E2E8F0'
      ctx.font = 'italic bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`“${activeShareLog.notes}”`, 360, 737)
    }
    
    // Fading Divider Line
    const divGrad = ctx.createLinearGradient(110, 0, 610, 0)
    divGrad.addColorStop(0, 'rgba(255,255,255,0)')
    divGrad.addColorStop(0.2, 'rgba(255,255,255,0.05)')
    divGrad.addColorStop(0.5, 'rgba(255,255,255,0.1)')
    divGrad.addColorStop(0.8, 'rgba(255,255,255,0.05)')
    divGrad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.strokeStyle = divGrad
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(110, 830)
    ctx.lineTo(610, 830)
    ctx.stroke()
    
    // Draw Footer Statistics
    ctx.fillStyle = '#64748B'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('ATHLETE IDENTITY', 110, 880)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(profile?.full_name || 'Athlete', 610, 880)
    
    ctx.fillStyle = '#64748B'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('CONSISTENCY STREAK', 110, 935)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#F97316'
    ctx.font = '900 18px sans-serif'
    ctx.fillText(`🔥 ${streakCount} Days Active`, 610, 935)
    
    ctx.fillStyle = '#64748B'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('TRAINING HUB', 110, 990)
    ctx.textAlign = 'right'
    ctx.font = '900 18px sans-serif'
    if (shareTheme === 'volcano') ctx.fillStyle = '#EF4444'
    else if (shareTheme === 'emerald') ctx.fillStyle = '#10B981'
    else ctx.fillStyle = '#3B82F6'
    ctx.fillText(membership?.gyms?.gym_name?.toUpperCase() || 'TRAINING GYM', 610, 990)
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚡ POWERED BY GYMIX.FIT • JOIN THE CLUB ⚡', 360, 1150)
    
    return canvas
  }

  // Draw high-resolution dynamic vertical story poster and download as file
  const handleDownloadImage = () => {
    const canvas = generatePosterCanvas()
    if (!canvas) return
    
    const link = document.createElement('a')
    link.download = `${profile?.full_name?.replace(/\s+/g, '_') || 'athlete'}_${activeShareLog.exercise_name?.replace(/\s+/g, '_')}_PR.png`
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Use Web Share API on mobile to share actual file, falls back to direct WhatsApp link on Desktop
  const handleNativeShare = async () => {
    const canvas = generatePosterCanvas()
    if (!canvas) return
    
    const caption = `💪 Verified Lift: I just smashed a new ${activeShareLog.exercise_name} PR of ${activeShareLog.value} kg at ${membership?.gyms?.gym_name || 'My Gym'} on Gymix! Consistency Streak: ${streakCount} Days! 🔥 #Gymix #FitnessGoal`
    
    try {
      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            // Direct text share fallback
            const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`
            window.open(waUrl, '_blank')
            return
          }
          
          const file = new File([blob], `${profile?.full_name?.replace(/\s+/g, '_') || 'athlete'}_PR.png`, { type: 'image/png' })
          
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'My Gymix PR Achievement!',
                text: caption
              })
            } catch (shareErr) {
              console.log('Share dismissed or failed, fallback to direct text link', shareErr)
              const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`
              window.open(waUrl, '_blank')
            }
          } else {
            const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`
            window.open(waUrl, '_blank')
          }
        }, 'image/png')
      } else {
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`
        window.open(waUrl, '_blank')
      }
    } catch (err) {
      console.error('Error sharing achievement:', err)
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`
      window.open(waUrl, '_blank')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* PR Lift Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Bench Press Card */}
        <div className="bg-[#1A1F2B] border border-white/5 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl">
          <p className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Bench Press Max</p>
          <p className="text-2xl font-black text-white">{prValues['Bench Press'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
          <span className="text-[8px] text-slate-500 font-bold uppercase">PR Lift 🔥</span>
        </div>

        {/* Squat Card */}
        <div className="bg-[#1A1F2B] border border-white/5 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl">
          <p className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Squat Max</p>
          <p className="text-2xl font-black text-white">{prValues['Squat'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
          <span className="text-[8px] text-slate-500 font-bold uppercase">PR Lift 🔥</span>
        </div>

        {/* Deadlift Card */}
        <div className="bg-[#1A1F2B] border border-white/5 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl">
          <p className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Deadlift Max</p>
          <p className="text-2xl font-black text-white">{prValues['Deadlift'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
          <span className="text-[8px] text-slate-500 font-bold uppercase">PR Lift 🔥</span>
        </div>

        {/* Body Weight Card */}
        <div className="bg-[#1A1F2B] border border-white/5 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl">
          <p className="text-[8px] font-black uppercase text-emerald-400 tracking-widest">Body Weight</p>
          <p className="text-2xl font-black text-white">{prValues['Body Weight'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
          <span className="text-[8px] text-slate-500 font-bold uppercase">Latest Log ⚖️</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* LOG PROGRESS FORM */}
        <div className="bg-[#1A1F2B] border border-white/5 rounded-[2.5rem] p-6 space-y-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Log Workout Progress</h4>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 font-medium">Record PRs or Body Weight updates</p>
            </div>
          </div>

          <form onSubmit={handleAddProgressLog} className="space-y-4">
            {/* Log Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewLogType('PR')
                  setNewExerciseName('Bench Press')
                }}
                className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer ${
                  newLogType === 'PR'
                  ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                  : 'bg-white/[0.02] border-white/5 text-slate-500'
                }`}
              >
                Max Lift PR 🔥
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewLogType('BODYWEIGHT')
                  setNewExerciseName('Body Weight')
                }}
                className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer ${
                  newLogType === 'BODYWEIGHT'
                  ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                  : 'bg-white/[0.02] border-white/5 text-slate-500'
                }`}
              >
                Body Weight ⚖️
              </button>
            </div>

            {/* Exercise Selection */}
            {newLogType === 'PR' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Select Exercise</label>
                <select 
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-amber-500/50 transition-all select-none"
                >
                  {['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press', 'Barbell Row', 'Incline Bench Press', 'Bicep Curl'].map((name) => (
                    <option key={name} value={name} className="bg-[#12141c] text-white py-2">{name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Value Input */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                {newLogType === 'PR' ? 'Lift Weight (kg)' : 'Body Weight (kg)'}
              </label>
              <input 
                type="number" 
                step="0.1"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                required
                placeholder="e.g. 85.5"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-amber-500/50 transition-all"
              />
            </div>

            {/* Notes Input */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Notes / Logs</label>
              <input 
                type="text" 
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g. Felt light, clean reps! (Optional)"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-amber-500/50 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loggingProgress}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loggingProgress ? (
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Log Entry
                </>
              )}
            </button>
          </form>
        </div>

        {/* PROGRESS LOG TIMELINE */}
        <div className="bg-[#1A1F2B] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-2xl">
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Progress Timeline</h4>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 font-medium">History of your workout gains</p>
          </div>

          {progressLoading ? (
            <div className="text-center py-10 text-slate-500 text-[10px] uppercase font-bold tracking-widest animate-pulse">Retreiving PR logs...</div>
          ) : progressLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-semibold">
              No progress entries logged yet. Record your lifts above to start tracking!
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {progressLogs.map((log) => {
                const date = new Date(log.recorded_at)
                const isPR = log.log_type === 'PR'
                return (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-between relative group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border text-xs font-black ${
                        isPR 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {isPR ? 'PR' : 'BW'}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white uppercase tracking-wide">
                            {log.exercise_name}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold">
                            {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-[10px] text-slate-400 font-medium italic">
                            “{log.notes}”
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black ${isPR ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {log.value} kg
                      </span>
                      <button
                        onClick={() => {
                          setActiveShareLog(log)
                          setShareModalOpen(true)
                        }}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow active:scale-95"
                        title="Share PR"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* INSTAGRAM SHARE MODAL (Flat styling, optimized for budget phones) */}
      {shareModalOpen && activeShareLog && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="max-w-md w-full flex flex-col items-center space-y-5 py-4">
            
            {/* THE SHARABLE CARD */}
            <div 
              id="share-pr-card"
              className={`w-full max-w-[310px] sm:max-w-[330px] aspect-[9/16] rounded-[2.2rem] bg-gradient-to-br ${getThemeStyles(shareTheme).bg} border-2 ${getThemeStyles(shareTheme).border} p-5.5 flex flex-col justify-between relative overflow-hidden shadow-2xl select-none`}
            >
              {/* CARD HEADER */}
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2">
                  <Logo className="w-6.5 h-6.5" />
                  <span className="text-[9px] font-black uppercase text-white tracking-[0.2em] italic">Gymix</span>
                </div>
                
                {/* Verified Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/35 text-[7px] font-black uppercase tracking-wider text-emerald-400">
                  <Check className="w-2.5 h-2.5" />
                  <span>Gymix Verified</span>
                </div>
              </div>

              {/* CARD BODY */}
              <div className="my-auto text-center space-y-5 relative z-10 pt-4">
                <span className="px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                  {activeShareLog.log_type === 'PR' ? '💪 New Personal Record' : '⚖️ Body Weight Log'}
                </span>
                
                <div className="space-y-2">
                  <h2 className={`text-xs font-black uppercase tracking-widest ${getThemeStyles(shareTheme).titleColor}`}>
                    {activeShareLog.exercise_name}
                  </h2>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <h1 className={`text-5xl font-black italic tracking-tighter ${getThemeStyles(shareTheme).statColor}`}>
                      {activeShareLog.value}
                    </h1>
                    <span className="text-xl font-black italic text-slate-500 uppercase tracking-wide">kg</span>
                  </div>
                </div>

                {activeShareLog.notes && (
                  <p className="text-[11px] font-semibold text-slate-300 italic max-w-[220px] mx-auto leading-relaxed px-4 py-1.5 rounded-xl bg-white/[0.01] border border-white/5">
                    “{activeShareLog.notes}”
                  </p>
                )}
              </div>

              {/* CARD FOOTER */}
              <div className="pt-4 border-t border-dashed border-white/10 relative z-10 flex flex-col gap-2.5 bg-black/20 p-3.5 rounded-2xl">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Athlete</span>
                  <span className="text-white font-black truncate max-w-[120px]">{profile?.full_name || 'Athlete'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Consistency Streak</span>
                  <span className="text-orange-400 font-black flex items-center gap-1">
                    <span>{streakCount} Days Active</span>
                    <span>🔥</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Training Hub</span>
                  <span className={`font-black uppercase italic truncate max-w-[120px] ${getThemeStyles(shareTheme).gymColor}`}>
                    {membership?.gyms?.gym_name || 'My Gym'}
                  </span>
                </div>
              </div>
            </div>

            {/* THEME SWAP BUTTONS */}
            <div className="w-full text-center space-y-2">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Select Story Poster Color Theme</span>
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={() => setShareTheme('cyber')}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${shareTheme === 'cyber' ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-white' : 'bg-white/5 border-white/5 text-slate-400'}`}
                >
                  🌌 Cyber Blue
                </button>
                <button 
                  onClick={() => setShareTheme('volcano')}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${shareTheme === 'volcano' ? 'bg-rose-500/20 border-rose-500 text-white' : 'bg-white/5 border-white/5 text-slate-400'}`}
                >
                  🌋 Volcano Red
                </button>
                <button 
                  onClick={() => setShareTheme('emerald')}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${shareTheme === 'emerald' ? 'bg-emerald-500/20 border-emerald-500 text-white' : 'bg-white/5 border-white/5 text-slate-400'}`}
                >
                  🌲 Forest Green
                </button>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="w-full space-y-2.5 text-center">
              <div className="flex flex-wrap gap-2.5 justify-center">
                <button 
                  onClick={handleNativeShare}
                  className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  Share Story
                </button>

                <button 
                  onClick={handleDownloadImage}
                  className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  Download PNG
                </button>
                
                <button 
                  onClick={() => {
                    const shareText = `💪 Verified Lift: I just smashed a new ${activeShareLog.exercise_name} PR of ${activeShareLog.value} kg at ${membership?.gyms?.gym_name || 'My Gym'} on Gymix! Consistency Streak: ${streakCount} Days! 🔥 #Gymix #FitnessGoal`
                    navigator.clipboard.writeText(shareText)
                    alert('Share text copied! Feel free to paste it into your caption.')
                  }}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  Copy Caption
                </button>

                <button 
                  onClick={() => {
                    setShareModalOpen(false)
                    setActiveShareLog(null)
                  }}
                  className="px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
