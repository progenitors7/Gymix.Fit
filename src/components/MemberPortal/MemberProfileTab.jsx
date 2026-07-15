import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Phone, Sparkles, Upload, Camera, Trash2, 
  Lock, Building, Copy, Check, CheckCircle2, ShieldAlert, X, ChevronRight
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { waFetch } from '../../lib/waFetch'
import ConfirmModal from '../UI/ConfirmModal'

export function MemberProfileTab({
  profile,
  membership,
  loadMemberSystem,
  refreshProfile,
  cooldownTimeLeft,
  avatarCooldownTimeLeft,
  nameChangeCount,
  avatarChangeCount,
  setActiveTab
}) {
  const [profileName, setProfileName] = useState(profile?.full_name || '')
  const [profilePhone, setProfilePhone] = useState(membership?.phone_number || profile?.phone_number || '')
  const [profileGender, setProfileGender] = useState(membership?.gender || profile?.gender || 'male')
  const [profileAvatar, setProfileAvatar] = useState(membership?.avatar_url || profile?.avatar_url || '')

  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const [avatarSize, setAvatarSize] = useState(null)
  
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)

  const [copiedGymCode, setCopiedGymCode] = useState(false)
  const [copiedAthleteId, setCopiedAthleteId] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  useEffect(() => {
    if (profile) {
      setProfileName(profile.full_name || '')
    }
    const phoneVal = membership?.phone_number || profile?.phone_number || ''
    const genderVal = membership?.gender || profile?.gender || 'male'
    const avatarVal = membership?.avatar_url || profile?.avatar_url || ''
    setProfilePhone(phoneVal)
    setProfileGender(genderVal)
    setProfileAvatar(avatarVal)
    if (avatarVal && avatarVal.startsWith('data:')) {
      setAvatarSize(getBase64SizeKB(avatarVal))
    } else {
      setAvatarSize(null)
    }
  }, [profile, membership])

  const getBase64SizeKB = (base64Str) => {
    if (!base64Str) return null
    const stringLength = base64Str.length - 'data:image/jpeg;base64,'.length
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489633
    return (sizeInBytes / 1024).toFixed(1)
  }

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxDim = 100
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.35)
          resolve(compressedBase64)
        }
        img.onerror = (err) => reject(err)
        img.src = event.target.result
      }
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  }

  const startCamera = async () => {
    try {
      setShowCamera(true)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setCameraStream(stream)
      setTimeout(() => {
        const videoEl = document.getElementById('member-webcam')
        if (videoEl) videoEl.srcObject = stream
      }, 100)
    } catch (err) {
      console.error('[Webcam] Error starting camera:', err)
      setProfileError('Failed to access camera. Check permissions.')
      setShowCamera(false)
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  const captureSnapshot = () => {
    const videoEl = document.getElementById('member-webcam')
    if (!videoEl) return

    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')

    ctx.translate(100, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(videoEl, 0, 0, 100, 100)

    const base64 = canvas.toDataURL('image/jpeg', 0.35)
    setProfileAvatar(base64)
    setAvatarSize(getBase64SizeKB(base64))
    stopCamera()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const base64 = await compressImage(file)
      setProfileAvatar(base64)
      setAvatarSize(getBase64SizeKB(base64))
    } catch (err) {
      console.error('[File] Error compressing image:', err)
      setProfileError('Failed to process image. Select another file.')
    }
  }

  const fetchGoogleAvatar = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const googlePic = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture
      if (googlePic) {
        setProfileAvatar(googlePic)
        setAvatarSize(null)
        setProfileSuccess('Google profile photo imported! ✨')
      } else {
        setProfileError('No profile photo found in active Google Account.')
      }
    } catch (err) {
      console.error('[Google] Error fetching profile picture:', err)
      setProfileError('Failed to fetch from Google profile.')
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (!profileName.trim()) return

    setSavingProfile(true)
    setProfileSuccess('')
    setProfileError('')

    try {
      const { data: dbProfile, error: fetchErr } = await supabase
        .from('profiles')
        .select('full_name, phone_number, name_change_count, last_name_change_at, avatar_url, avatar_change_count, last_avatar_change_at')
        .eq('id', profile.id)
        .single()

      if (fetchErr) throw fetchErr

      const nameChanged = dbProfile.full_name !== profileName.trim()
      const phoneChanged = dbProfile.phone_number !== profilePhone.trim()
      const eitherChanged = nameChanged || phoneChanged

      let newCount = dbProfile.name_change_count || 0
      let newLastChangeAt = dbProfile.last_name_change_at

      if (eitherChanged) {
        const chgCount = dbProfile.name_change_count || 0
        const lastChgAt = dbProfile.last_name_change_at
        
        if (chgCount >= 3 && lastChgAt) {
          const lastChangeDate = new Date(lastChgAt)
          const currentDate = new Date()
          const diffMs = currentDate - lastChangeDate
          const diffDays = diffMs / (1000 * 60 * 60 * 24)
          if (diffDays < 90) {
            const daysRemaining = Math.ceil(90 - diffDays)
            throw new Error(`You have reached the limit of 3 profile changes in 3 months. You can edit your name/number again in ${daysRemaining} days, or ask your Gym Owner to change it from their dashboard.`)
          } else {
            newCount = 1
            newLastChangeAt = new Date().toISOString()
          }
        } else {
          newCount = chgCount + 1
          newLastChangeAt = new Date().toISOString()
        }
      }

      const avatarChanged = dbProfile.avatar_url !== (profileAvatar || null)
      let newAvatarCount = dbProfile.avatar_change_count || 0
      let newLastAvatarChangeAt = dbProfile.last_avatar_change_at

      if (avatarChanged) {
        const avChgCount = dbProfile.avatar_change_count || 0
        const lastAvChgAt = dbProfile.last_avatar_change_at
        
        if (avChgCount >= 3 && lastAvChgAt) {
          const lastChangeDate = new Date(lastAvChgAt)
          const currentDate = new Date()
          const diffMs = currentDate - lastChangeDate
          const diffDays = diffMs / (1000 * 60 * 60 * 24)
          if (diffDays < 90) {
            const daysRemaining = Math.ceil(90 - diffDays)
            throw new Error(`You have reached the limit of 3 profile photo changes in 3 months. You can edit your photo again in ${daysRemaining} days, or ask your Gym Owner to change it from their dashboard.`)
          } else {
            newAvatarCount = 1
            newLastAvatarChangeAt = new Date().toISOString()
          }
        } else {
          newAvatarCount = avChgCount + 1
          newLastAvatarChangeAt = new Date().toISOString()
        }
      }

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: profileName.trim(),
          phone_number: profilePhone.trim(),
          gender: profileGender,
          avatar_url: profileAvatar || null,
          name_change_count: newCount,
          last_name_change_at: newLastChangeAt,
          avatar_change_count: newAvatarCount,
          last_avatar_change_at: newLastAvatarChangeAt
        })
        .eq('id', profile.id)

      if (profileErr) throw profileErr

      if (membership) {
        const { error: memberErr } = await supabase
          .from('members')
          .update({
            full_name: profileName.trim(),
            phone_number: profilePhone.trim(),
            gender: profileGender,
            avatar_url: profileAvatar || null
          })
          .eq('id', membership.id)

        if (memberErr) throw memberErr
      }

      setProfileSuccess('Profile updated successfully! ✨')
      
      if (refreshProfile) {
        await refreshProfile()
      }
      
      await loadMemberSystem()
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile settings.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleLeaveGym = () => {
    setShowLeaveConfirm(true)
  }

  const executeLeaveGym = async () => {
    if (!membership) return
    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('members')
        .update({ 
          profile_id: null,
          status: 'left',
          left_at: new Date().toISOString()
        })
        .eq('id', membership.id)

      if (error) throw error

      // Send goodbye WhatsApp message if autopilot is connected
      if (membership.phone_number && membership.gym_id) {
        try {
          const saved = localStorage.getItem(`gym_settings_${membership.gym_id}`);
          const parsed = saved ? JSON.parse(saved) : {};

          const sendGoodbye = async () => {
            try {
              const statusRes = await waFetch(`/api/whatsapp/status?gymId=${membership.gym_id}`);
              if (!statusRes.ok) return;
              const statusData = await statusRes.json();

              const isConnected = statusData.status === 'connected';
              const autopilotEnabled = membership.gyms?.wa_autopilot_enabled ?? parsed.waAutopilotEnabled ?? false;

              if (autopilotEnabled && isConnected) {
                const { DEFAULT_LEFT_TEMPLATE } = await import('../../config/whatsappTemplates');
                const leftTemplate = membership.gyms?.wa_template_left || parsed.waTemplateLeft || DEFAULT_LEFT_TEMPLATE;
                const text = leftTemplate
                  .replace(/{{name}}/g, membership.full_name || profile?.full_name || 'Member')
                  .replace(/{{gymName}}/g, membership.gyms?.gym_name || 'Gym')
                  .replace(/{{plan}}/g, membership.membership_plan || 'Plan')
                  .replace(/{{date}}/g, membership.expiry_date ? new Date(membership.expiry_date).toLocaleDateString() : 'soon');

                await waFetch('/api/whatsapp/send', {
                  method: 'POST',
                  body: JSON.stringify({
                    gymId: membership.gym_id,
                    phone: membership.phone_number,
                    message: text
                  })
                });
                console.log('[Gymix WA] Goodbye message sent on member disconnect');
              }
            } catch (err) {
              console.warn('[Gymix WA] Goodbye message error:', err);
            }
          };
          sendGoodbye();
        } catch (e) {
          console.warn('[Gymix WA] Goodbye trigger error:', e);
        }
      }
      
      setProfileSuccess('Successfully disconnected from your gym. Your data will be kept for 30 days in case you wish to rejoin.')
      await loadMemberSystem()
      setActiveTab('pass')
    } catch (err) {
      setProfileError('Failed to leave gym. Please check your network.')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <motion.div
      key="profile-tab"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {profileSuccess && (
        <div className="px-4.5 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4 inline mr-2 text-emerald-400" />
          {profileSuccess}
        </div>
      )}
      
      {profileError && (
        <div className="px-4.5 py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[11px] font-bold uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 inline mr-2 text-rose-400" />
          {profileError}
        </div>
      )}

      {/* Mobile Quick-Access to Lifts PR */}
      <div 
        onClick={() => setActiveTab('progress')}
        className="lg:hidden p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between cursor-pointer active:scale-98 transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-500/25 text-amber-400">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div className="text-left">
            <span className="text-[8px] font-black uppercase text-amber-400 tracking-widest leading-none">Athlete Logs</span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wide mt-0.5">Track Lifts & PR Progress</h4>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Profile editing card */}
        <div className="bg-[#1A1F2B] border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/20 text-[#3B82F6]">
              <User className="w-4.5 h-4.5" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Personal Settings</h4>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Configure your athlete identity</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Photo Selection Widget */}
            <div className="flex flex-col items-center gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
              
              {/* Flat Avatar Frame */}
              <div className="relative group w-24 h-24 rounded-full p-[2px] bg-white/10 hover:border-white/20 transition-all duration-200">
                <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-900">
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-500" />
                  )}
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={avatarCooldownTimeLeft > 0 || savingProfile}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              <div className="text-center space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Profile Photo</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
                <input
                  type="file"
                  accept="image/*"
                  id="dashboard-avatar-upload"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={avatarCooldownTimeLeft > 0 || savingProfile}
                />
                <label
                  htmlFor="dashboard-avatar-upload"
                  className={`p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 ${avatarCooldownTimeLeft > 0 ? 'opacity-50 pointer-events-none' : ''}`}
                  title="Upload Photo"
                >
                  <Upload className="w-4 h-4 text-[#3B82F6]" />
                </label>

                <button
                  type="button"
                  onClick={startCamera}
                  disabled={avatarCooldownTimeLeft > 0 || savingProfile}
                  className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  title="Take Photo"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={fetchGoogleAvatar}
                  disabled={avatarCooldownTimeLeft > 0 || savingProfile}
                  className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  title="Sync Google Photo"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </button>

                {profileAvatar && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileAvatar('');
                      setAvatarSize(null);
                    }}
                    disabled={avatarCooldownTimeLeft > 0 || savingProfile}
                    className="p-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/35 text-rose-400 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                    title="Clear Photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Photo updates quota */}
              {avatarCooldownTimeLeft > 0 && (
                <div className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 justify-center mt-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Photo Changes Locked ({avatarCooldownTimeLeft} days left)</span>
                </div>
              )}
            </div>
            
            {/* Name/Phone cooldown info */}
            {cooldownTimeLeft > 0 && (
              <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-2 justify-center">
                <Lock className="w-3.5 h-3.5" />
                <span>Name/Phone Changes Locked ({cooldownTimeLeft} days left)</span>
              </div>
            )}

            {/* Name input */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Full Display Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  required
                  disabled={cooldownTimeLeft > 0 || savingProfile}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/40 border border-white/5 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/20 transition-all disabled:opacity-40"
                  placeholder="Display name"
                />
              </div>
            </div>

            {/* Phone input */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  disabled={cooldownTimeLeft > 0 || savingProfile}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/40 border border-white/5 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/20 transition-all disabled:opacity-40"
                  placeholder="Add phone number"
                />
              </div>
            </div>

            {/* Gender buttons */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Gender Preference</label>
              <div className="grid grid-cols-3 gap-2">
                {['male', 'female', 'other'].map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => setProfileGender(gender)}
                    disabled={savingProfile}
                    className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 duration-150 ${
                      profileGender === gender
                      ? 'bg-[#3B82F6]/10 border-[#3B82F6] text-white'
                      : 'bg-slate-950/30 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-400'
                    }`}
                  >
                    <span>
                      {gender === 'male' && '♂'}
                      {gender === 'female' && '♀'}
                      {gender === 'other' && '⚧'}
                    </span>
                    <span>{gender}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={cooldownTimeLeft > 0 || savingProfile}
              className="w-full py-3.5 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingProfile ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : cooldownTimeLeft > 0 ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Changes Locked
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
            <p className="text-[9px] text-slate-500 font-semibold text-center italic mt-2.5">
              * Profile updates (display name, phone number, and photo) are limited to 3 edits per 3 months to prevent duplicate account manipulation.
            </p>
          </form>
        </div>

        {/* Connected Gym & Active membership metadata card */}
        {membership && (
          <div className="bg-[#1A1F2B] border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* VIP Membership Header Card */}
              <div className="relative p-5 rounded-xl bg-slate-950/40 border border-emerald-500/10 overflow-hidden text-left">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Building className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">CONNECTED GYM HUB</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tight leading-tight">
                      {membership.gyms?.gym_name || 'My Gym'}
                    </h3>
                    
                    {/* Code copy block */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Access Code:</span>
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(membership.gyms?.unique_code || '')
                          setCopiedGymCode(true)
                          setTimeout(() => setCopiedGymCode(false), 2000)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-white/5 hover:border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-mono text-[10px] font-bold tracking-widest cursor-pointer hover:bg-slate-950 transition-all active:scale-95"
                        title="Copy gym access code"
                      >
                        <span>{membership.gyms?.unique_code}</span>
                        {copiedGymCode ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Athlete Info Stack */}
              <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-left ml-1">Athlete Pass Info</h4>
                
                <div className="space-y-2 text-xs">
                  {/* Athlete ID */}
                  <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-950/30 border border-white/5 hover:border-white/10 transition-colors">
                    <span className="text-slate-400 font-medium text-left">Athlete ID</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono font-bold select-all text-[10px] max-w-[120px] truncate">{membership.id}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(membership.id)
                          setCopiedAthleteId(true)
                          setTimeout(() => setCopiedAthleteId(false), 2000)
                        }}
                        className="text-slate-500 hover:text-white p-1 transition-all cursor-pointer active:scale-90"
                        title="Copy Athlete ID"
                      >
                        {copiedAthleteId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-950/30 border border-white/5">
                    <span className="text-slate-400 font-medium text-left">Email Address</span>
                    <span className="text-white font-semibold text-right">{profile?.email}</span>
                  </div>

                  {/* Active Pass Plan */}
                  <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-950/30 border border-white/5">
                    <span className="text-slate-400 font-medium text-left">Active Pass Plan</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold uppercase tracking-wider text-[9px]">
                      {membership.membership_plan}
                    </span>
                  </div>

                  {/* Member Since */}
                  <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-950/30 border border-white/5">
                    <span className="text-slate-400 font-medium text-left">Member Since</span>
                    <span className="text-white font-semibold text-right">{membership.join_date}</span>
                  </div>

                  {/* Pass Expiry */}
                  <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-950/30 border border-white/5">
                    <span className="text-slate-400 font-medium text-left">Pass Expiry</span>
                    <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px] text-right">{membership.expiry_date || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* DANGER: LEAVE GYM BUTTON */}
            <button
              type="button"
              onClick={handleLeaveGym}
              disabled={savingProfile}
              className="w-full py-3.5 rounded-xl bg-rose-950/10 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 hover:text-rose-300 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer mt-6 active:scale-[0.97] disabled:opacity-50"
            >
              Disconnect from Gym Hub
            </button>
          </div>
        )}

      </div>

      <ConfirmModal
        open={showLeaveConfirm}
        title="Disconnect Gym"
        message="Are you sure you want to disconnect from this gym? Your data will be kept for 30 days — if you rejoin within that time, all your check-in history, coins, and progress will be restored automatically."
        confirmLabel="Disconnect"
        loading={savingProfile}
        onConfirm={async () => {
          await executeLeaveGym()
          setShowLeaveConfirm(false)
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* ── WEBCAM SNAPSHOT MODAL OVERLAY ── */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-[#0F111A] border border-white/10 rounded-2xl p-6 relative shadow-2xl flex flex-col items-center gap-6"
            >
              <div className="w-full flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Webcam Capture</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Snap a display picture</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={stopCamera}
                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Viewfinder camera view */}
              <div className="w-64 h-64 rounded-full border-4 border-emerald-500/20 relative overflow-hidden bg-black flex items-center justify-center">
                <video
                  id="member-webcam"
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                
                {/* Circular guide */}
                <div className="absolute inset-4 rounded-full border border-dashed border-emerald-500/30 pointer-events-none flex items-center justify-center" />
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureSnapshot}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Snap Photo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function MemberOnboarding({
  profile,
  membership,
  loadMemberSystem,
  refreshProfile,
  signOut
}) {
  const [onboardName, setOnboardName] = useState(profile?.full_name || '')
  const [onboardPhone, setOnboardPhone] = useState(profile?.phone_number || '')
  const [onboardGender, setOnboardGender] = useState(profile?.gender || 'male')
  const [onboardSaving, setOnboardSaving] = useState(false)
  const [onboardError, setOnboardError] = useState('')

  useEffect(() => {
    if (profile) {
      setOnboardName(profile.full_name || '')
      setOnboardPhone(profile.phone_number || '')
      setOnboardGender(profile.gender || 'male')
    }
  }, [profile])

  const handleOnboardSubmit = async (e) => {
    e.preventDefault()
    if (!onboardName.trim()) {
      setOnboardError('Full name is required!')
      return
    }
    if (!onboardPhone.trim()) {
      setOnboardError('Phone number is required!')
      return
    }

    setOnboardSaving(true)
    setOnboardError('')

    try {
      const { error: onboardErr } = await supabase
        .from('profiles')
        .update({
          full_name: onboardName.trim(),
          phone_number: onboardPhone.trim(),
          gender: onboardGender,
          onboarding_completed: true
        })
        .eq('id', profile.id)

      if (onboardErr) throw onboardErr

      // Sync member table if already connected
      if (membership) {
        const { error: memberErr } = await supabase
          .from('members')
          .update({
            full_name: onboardName.trim(),
            phone_number: onboardPhone.trim(),
            gender: onboardGender
          })
          .eq('id', membership.id)

        if (memberErr) throw memberErr
      }

      if (refreshProfile) {
        await refreshProfile()
      }

      await loadMemberSystem()
    } catch (err) {
      setOnboardError(err.message || 'Failed to complete profile setup. Please try again.')
    } finally {
      setOnboardSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-100 font-sans flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1A1F2B] border border-white/5 rounded-2xl p-8 text-center space-y-6 max-w-md w-full relative overflow-hidden"
      >
        <div className="space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-[#3B82F6]" />
          </div>
          
          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[9px] font-black uppercase tracking-widest text-[#3B82F6]">
              Setup Your Athlete Profile
            </span>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight pt-1">
              Welcome to Gymix!
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto font-semibold">
              Please complete your display profile to get connected to your Gym Hub.
            </p>
          </div>

          {onboardError && (
            <div className="px-4.5 py-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider text-left flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{onboardError}</span>
            </div>
          )}

          <form onSubmit={handleOnboardSubmit} className="space-y-4 text-left">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Full Display Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#3B82F6] transition-colors" />
                <input
                  type="text"
                  placeholder="E.g. Shubh Sharma"
                  value={onboardName}
                  onChange={(e) => setOnboardName(e.target.value)}
                  required
                  disabled={onboardSaving}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/20 transition-all"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Mobile Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#3B82F6] transition-colors" />
                <input
                  type="tel"
                  placeholder="E.g. +91 9999999999"
                  value={onboardPhone}
                  onChange={(e) => setOnboardPhone(e.target.value)}
                  required
                  disabled={onboardSaving}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/20 transition-all"
                />
              </div>
            </div>

            {/* Gender Preference */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Gender Preference</label>
              <div className="grid grid-cols-3 gap-2">
                {['male', 'female', 'other'].map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    disabled={onboardSaving}
                    onClick={() => setOnboardGender(gender)}
                    className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer hover:border-white/20 ${
                      onboardGender === gender
                      ? 'bg-[#3B82F6]/10 border-[#3B82F6] text-white'
                      : 'bg-white/[0.02] border-white/5 text-slate-500'
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={onboardSaving}
              className="w-full py-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {onboardSaving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete Profile Setup
                </>
              )}
            </button>
          </form>

          {/* Logout Action */}
          <div className="pt-4 border-t border-white/5">
            <button
              onClick={signOut}
              type="button"
              className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
