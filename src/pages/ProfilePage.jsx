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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Header and navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="group w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all duration-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">Owner Account</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight text-left">Gym Owner Profile</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Avatar Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-5 shadow-xs relative overflow-hidden">
          <div className="relative space-y-4">
            <div className="relative w-24 h-24 mx-auto rounded-full p-0.5 bg-emerald-500/30 overflow-hidden flex items-center justify-center shadow-xs">
              <div className="w-full h-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400 dark:text-zinc-500" />
                )}
              </div>
              
              {/* Overlaid upload input */}
              <label className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white gap-1 rounded-full">
                <Camera className="w-4 h-4" />
                <span className="text-[8px] font-bold uppercase tracking-wider">Upload</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
              </label>
            </div>

            <div className="space-y-1">
              <h3 className="text-slate-900 dark:text-white font-bold text-base leading-tight truncate">
                {profileName || 'New Gym Owner'}
              </h3>
              <p className="text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider leading-none">
                {profile?.role === 'owner' ? 'Gym Owner' : 'Gym Administrator'}
              </p>
            </div>

            {/* Avatar Stats / Delete */}
            <div className="flex justify-center gap-2">
              {profileAvatar && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileAvatar('')
                    setAvatarSize(null)
                    toast.success('Avatar cleared!')
                  }}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Form details and associated Gym details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Settings / Edit Info */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <form onSubmit={handleSaveProfile} className="space-y-6 relative z-10 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Full Name */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Gym Owner Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" />
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter full name..."
                      className="onboarding-profile-name w-full bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Contact Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" />
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="onboarding-profile-phone w-full bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Gender Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Gender</label>
                  <div className="relative group">
                    <select
                      value={profileGender}
                      onChange={(e) => setProfileGender(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm font-medium appearance-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-xs"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Email Address (READ-ONLY account lock) */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Login Account Email</label>
                    <span className="flex items-center gap-1 text-rose-500 text-[10px] font-bold uppercase tracking-wider">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  </div>
                  <div className="relative group opacity-80">
                    <div className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-600 dark:text-zinc-400 text-sm font-medium select-all">
                      {profile?.email || 'No email associated'}
                    </div>
                  </div>
                  <p className="text-slate-500 dark:text-zinc-500 text-xs font-normal ml-0.5">
                    Your email is bound securely as your login identity and cannot be edited.
                  </p>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 text-right">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="onboarding-profile-save w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold rounded-xl text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 text-left space-y-5 shadow-xs relative overflow-hidden">
              <div className="relative z-10 space-y-5">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Associated Gym Details
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Linked Terminal gateway metadata & identity</p>
                </div>

                <form onSubmit={handleUpdateGymName} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Gym Name (Editable) */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Gym Name</label>
                      <div className="relative group">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" />
                        <input
                          type="text"
                          required
                          value={newGymName}
                          onChange={(e) => setNewGymName(e.target.value)}
                          placeholder="Enter gym name..."
                          className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Gym Connections Code */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Gym Connection Code</label>
                      <div className="relative group flex items-center bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5">
                        <div className="flex-1">
                          <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider select-all">{gym.unique_code}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyGymCode}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90 cursor-pointer"
                          title="Copy gym connection code"
                        >
                          {copiedGymCode ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Registry Date */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Registry Date</label>
                      <div className="relative group flex items-center bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5">
                        <Calendar className="w-4 h-4 text-slate-400 mr-2.5" />
                        <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                          {gym?.created_at ? new Date(gym.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    </div>

                    {/* Gym ID (Read Only Lock) */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between px-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Gym ID</label>
                        <span className="flex items-center gap-1 text-rose-500 text-[10px] font-bold uppercase tracking-wider">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      </div>
                      <div className="relative group opacity-80">
                        <div className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-500 dark:text-zinc-500 font-mono text-xs select-all">
                          {gym?.id || 'No ID associated'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {newGymName.trim() !== gym?.gym_name && (
                    <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 text-right">
                      <button
                        type="submit"
                        disabled={savingGymName}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {savingGymName ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
