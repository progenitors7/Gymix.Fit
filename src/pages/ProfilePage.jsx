import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  User, Phone, Sparkles, Upload, Camera, Trash2, 
  Lock, Building, Copy, Check, CheckCircle2, X, ArrowLeft, Calendar
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useGym } from '../hooks/useGym'
import { toast } from 'react-hot-toast'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const { gym, updateGymName } = useGym()

  const [profileName, setProfileName] = useState(profile?.full_name || '')
  const [profilePhone, setProfilePhone] = useState(profile?.phone_number || '')
  const [profileGender, setProfileGender] = useState(profile?.gender || 'male')
  const [profileAvatar, setProfileAvatar] = useState(profile?.avatar_url || '')

  const [savingProfile, setSavingProfile] = useState(false)
  const [copiedGymCode, setCopiedGymCode] = useState(false)
  const [avatarSize, setAvatarSize] = useState(null)

  const [newGymName, setNewGymName] = useState(gym?.gym_name || '')
  const [savingGymName, setSavingGymName] = useState(false)

  useEffect(() => {
    if (profile) {
      setProfileName(profile.full_name || '')
      setProfilePhone(profile.phone_number || '')
      setProfileGender(profile.gender || 'male')
      setProfileAvatar(profile.avatar_url || '')
      
      if (profile.avatar_url && profile.avatar_url.startsWith('data:')) {
        setAvatarSize(getBase64SizeKB(profile.avatar_url))
      }
    }
  }, [profile])

  useEffect(() => {
    if (gym) {
      setNewGymName(gym.gym_name || '')
    }
  }, [gym])

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
          const maxDim = 120
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

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4)
          resolve(compressedBase64)
        }
        img.onerror = (err) => reject(err)
        img.src = event.target.result
      }
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const base64 = await compressImage(file)
      setProfileAvatar(base64)
      setAvatarSize(getBase64SizeKB(base64))
      toast.success('Profile photo uploaded! 📸')
    } catch (err) {
      console.error('[Avatar] Compression error:', err)
      toast.error('Failed to compress profile image.')
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profileName.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    setSavingProfile(true)
    try {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: profileName.trim(),
          phone_number: profilePhone.trim(),
          gender: profileGender,
          avatar_url: profileAvatar || null
        })
        .eq('id', profile.id)

      if (profileErr) throw profileErr

      toast.success('Profile updated successfully! ✨')
      if (refreshProfile) {
        await refreshProfile()
      }
    } catch (err) {
      console.error('[Profile] Save failed:', err)
      toast.error(err.message || 'Failed to update profile details.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCopyGymCode = () => {
    if (!gym?.unique_code) return
    navigator.clipboard.writeText(gym.unique_code)
    setCopiedGymCode(true)
    toast.success('Copied Gym Connection Code!')
    setTimeout(() => setCopiedGymCode(false), 2000)
  }

  const handleUpdateGymName = async (e) => {
    e.preventDefault()
    if (!newGymName.trim()) {
      toast.error('Gym name cannot be empty')
      return
    }
    if (newGymName.trim() === gym?.gym_name) {
      toast.error('No changes to save')
      return
    }

    setSavingGymName(true)
    try {
      await updateGymName(newGymName.trim())
      toast.success('Gym name updated successfully! 🏢')
    } catch (err) {
      console.error('[GymName] Update failed:', err)
      toast.error(err.message || 'Failed to update gym name.')
    } finally {
      setSavingGymName(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 pb-24 lg:pb-8">
      {/* Header and navigation */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="group w-12 h-12 rounded-2xl bg-[#1A1F2B] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em]">Owner Account</p>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter text-left">Gym Owner Profile</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Avatar Panel */}
        <div className="glass-card border border-white/5 rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative space-y-4">
            <div className="relative w-28 h-28 mx-auto rounded-full p-1 bg-gradient-to-tr from-blue-500 to-indigo-500 shadow-xl overflow-hidden flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#151922] overflow-hidden flex items-center justify-center">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-600 animate-pulse" />
                )}
              </div>
              
              {/* Overlaid upload input */}
              <label className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white gap-1 rounded-full">
                <Camera className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-wider">Upload</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
              </label>
            </div>

            <div className="space-y-1">
              <h3 className="text-white font-extrabold text-base leading-tight uppercase truncate">
                {profileName || 'New Gym Owner'}
              </h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">
                {profile?.role === 'owner' ? 'Gym Owner' : 'Gym Administrator'}
              </p>
            </div>

            {/* Avatar Stats / Delete */}
            <div className="flex justify-center gap-3">
              {profileAvatar && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileAvatar('')
                    setAvatarSize(null)
                    toast.success('Avatar cleared!')
                  }}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>


          </div>
        </div>

        {/* Right Side: Form details and associated Gym details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Settings / Edit Info */}
          <div className="glass-card border border-white/5 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <form onSubmit={handleSaveProfile} className="space-y-8 relative z-10 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Full Name */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Gym Owner Name</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter full name..."
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Contact Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Gender Selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Gender</label>
                  <div className="relative group">
                    <select
                      value={profileGender}
                      onChange={(e) => setProfileGender(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white text-sm font-medium appearance-none focus:outline-none focus:bg-white/[0.05] focus:border-blue-500/50 transition-all"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Email Address (READ-ONLY account lock) */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Login Account Email</label>
                    <span className="flex items-center gap-1 text-[#EF4444] text-[8px] font-black uppercase tracking-wider">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  </div>
                  <div className="relative group opacity-60">
                    <div className="w-full bg-white/[0.01] border border-white/5 rounded-2xl pl-5 pr-4 py-4 text-slate-500 text-sm font-semibold select-all">
                      {profile?.email || 'No email associated'}
                    </div>
                  </div>
                  <p className="text-slate-600 text-[9px] font-medium ml-1">
                    Your email is bound securely as your login identity and cannot be edited.
                  </p>
                </div>

              </div>

              <div className="pt-6 border-t border-white/5 text-right">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full sm:w-auto px-10 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving changes…
                    </span>
                  ) : (
                    <span>Save Owner Details</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Associated Gym details */}
          {gym && (
            <div className="glass-card border border-white/5 rounded-[2.5rem] p-8 text-left space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
              
              <div className="relative z-10 space-y-6">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-400" />
                    Associated Gym Details
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Linked Terminal gateway metadata & Identity</p>
                </div>

                <form onSubmit={handleUpdateGymName} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Gym Name (Editable) */}
                    <div className="space-y-2 sm:col-span-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Gym Name</label>
                      <div className="relative group">
                        <Building className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                          type="text"
                          required
                          value={newGymName}
                          onChange={(e) => setNewGymName(e.target.value)}
                          placeholder="Enter gym name..."
                          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Gym Connections Code */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Gym Connections Code</label>
                      <div className="relative group flex items-center bg-[#1A1F2B] border border-white/5 rounded-2xl px-5 py-4">
                        <div className="flex-1">
                          <span className="text-sm font-mono font-black text-emerald-400 tracking-wider select-all">{gym.unique_code}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyGymCode}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer"
                          title="Copy gym connection code"
                        >
                          {copiedGymCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Registry Date */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Registry Date</label>
                      <div className="relative group flex items-center bg-[#1A1F2B] border border-white/5 rounded-2xl px-5 py-4">
                        <Calendar className="w-4 h-4 text-slate-500 mr-3" />
                        <span className="text-sm font-semibold text-slate-300">
                          {gym?.created_at ? new Date(gym.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    </div>

                    {/* Gym ID (Read Only Lock) */}
                    <div className="space-y-2 sm:col-span-2">
                      <div className="flex items-center justify-between px-1">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Gym ID</label>
                        <span className="flex items-center gap-1 text-[#EF4444] text-[8px] font-black uppercase tracking-wider">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      </div>
                      <div className="relative group opacity-60">
                        <div className="w-full bg-[#1A1F2B] border border-white/5 rounded-2xl px-5 py-4 text-slate-500 font-mono text-xs select-all">
                          {gym?.id || 'No ID associated'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {newGymName.trim() !== gym?.gym_name && (
                    <div className="pt-4 border-t border-white/5 text-right">
                      <button
                        type="submit"
                        disabled={savingGymName}
                        className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                      >
                        {savingGymName ? (
                          <span className="flex items-center justify-center gap-3">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Updating…
                          </span>
                        ) : (
                          <span>Update Gym Name</span>
                        )}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  )
}
