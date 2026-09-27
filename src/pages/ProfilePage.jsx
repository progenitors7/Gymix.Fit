import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  User, Phone, Camera, Trash2, 
  Building, Copy, Check, ArrowLeft,
  ShieldCheck, ExternalLink, Settings, CreditCard, Sparkles
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useGym } from '../hooks/useGym'
import { toast } from 'react-hot-toast'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const { gym, updateGymName } = useGym()
  const fileInputRef = useRef(null)

  const [profileName, setProfileName] = useState(profile?.full_name || '')
  const [profilePhone, setProfilePhone] = useState(profile?.phone_number || '')
  const [profileGender, setProfileGender] = useState(profile?.gender || 'male')
  const [profileAvatar, setProfileAvatar] = useState(profile?.avatar_url || '')

  const [savingProfile, setSavingProfile] = useState(false)
  const [copiedGymCode, setCopiedGymCode] = useState(false)

  const [newGymName, setNewGymName] = useState(gym?.gym_name || '')
  const [savingGymName, setSavingGymName] = useState(false)

  useEffect(() => {
    if (profile) {
      setProfileName(profile.full_name || '')
      setProfilePhone(profile.phone_number || '')
      setProfileGender(profile.gender || 'male')
      setProfileAvatar(profile.avatar_url || '')
    }
  }, [profile])

  useEffect(() => {
    if (gym) {
      setNewGymName(gym.gym_name || '')
    }
  }, [gym])

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxDim = 160
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

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6)
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
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const base64 = await compressImage(file)
      setProfileAvatar(base64)
      toast.success('Photo selected! Click "Save Changes" below to apply.')
    } catch (err) {
      console.error('[Avatar] Compression error:', err)
      toast.error('Failed to process image. Please try another image.')
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profileName.trim()) {
      toast.error('Full name cannot be empty')
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

      toast.success('Profile updated successfully!')
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
    toast.success('Gym connection code copied!')
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
      toast.success('Gym name updated successfully!')
    } catch (err) {
      console.error('[GymName] Update failed:', err)
      toast.error(err.message || 'Failed to update gym name.')
    } finally {
      setSavingGymName(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header and navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Owner Profile
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Manage your personal identity, contact details, and gym affiliation.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {profile?.role === 'owner' ? 'Gym Owner' : 'Gym Administrator'}
          </span>
        </div>
      </div>

      {/* 1. Profile Identity & Photo Card */}
      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full border border-slate-200 dark:border-zinc-700 overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0">
              {profileAvatar ? (
                <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-zinc-500">
                  <User className="w-8 h-8" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {profileName || 'Gym Owner'}
                </h2>
                <span className="sm:hidden inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Owner
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {profile?.email || 'No email associated'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {gym?.gym_name ? `Managing ${gym.gym_name}` : 'Gymix Gym Administrator'}
              </p>
            </div>
          </div>

          {/* Photo Action Buttons */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800">
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Photo</span>
            </button>
            {profileAvatar && (
              <button
                type="button"
                onClick={() => {
                  setProfileAvatar('')
                  toast.success('Photo removed. Click "Save Changes" to apply.')
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Personal Information Form */}
      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <div className="mb-5 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Personal Information
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Your personal details shown on system receipts and official notices.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Full Name
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your full name"
                className="onboarding-profile-name w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Contact Phone Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="onboarding-profile-phone w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            {/* Gender Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Gender
              </label>
              <select
                value={profileGender}
                onChange={(e) => setProfileGender(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="onboarding-profile-save w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {savingProfile ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Account Login & Security Card */}
      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <div className="mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Login & Account Security
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Your login identity is securely managed and protected.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Account Email</span>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {profile?.email || 'No email on record'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Primary Identity • Secured</span>
          </div>
        </div>
      </div>

      {/* 4. Connected Gym Card (Replaces the fake terminal metadata) */}
      {gym && (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                Connected Gym Organization
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Branch details and member connection credentials.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Gym Settings</span>
              </Link>
              <Link
                to="/billing"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Plan & Billing</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gym Name & Quick Update */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block mb-1">
                  Gym / Branch Name
                </span>
                <form onSubmit={handleUpdateGymName} className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    value={newGymName}
                    onChange={(e) => setNewGymName(e.target.value)}
                    placeholder="Gym Name"
                    className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  {newGymName.trim() !== gym?.gym_name && (
                    <button
                      type="submit"
                      disabled={savingGymName}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {savingGymName ? 'Saving...' : 'Update'}
                    </button>
                  )}
                </form>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Registered on {gym?.created_at ? new Date(gym.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
              </p>
            </div>

            {/* Gym Connection Code with 1-Click Copy */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                    Gym Connection Code
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    For Member & Staff App
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5">
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tracking-widest">
                    {gym.unique_code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyGymCode}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {copiedGymCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Members use this code to join your gym from the mobile app.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
