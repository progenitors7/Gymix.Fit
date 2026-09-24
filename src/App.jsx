import React, { Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthProvider'
import { GymProvider } from './context/GymProvider'
import { NotificationProvider } from './context/NotificationProvider'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import AppLayout from './components/Layout/AppLayout'
import ErrorBoundary from './components/Common/ErrorBoundary'
import SuperAdminRoute from './components/Layout/SuperAdminRoute'
import Logo from './components/UI/Logo'
import { useAuth } from './hooks/useAuth'
import { Toaster, toast } from 'react-hot-toast'
import { pushNotificationService } from './services/pushNotificationService'
import AppUpdateChecker from './components/Common/AppUpdateChecker'
import { isNativeCapacitorApp } from './utils/platform'
import { isSuperAdmin } from './config/admins'


const LandingPage = React.lazy(() => import('./pages/LandingPage'))
const AuthPage = React.lazy(() => import('./components/Auth/AuthPage'))
const Dashboard = React.lazy(() => import('./components/Dashboard/Dashboard'))
const MembersPage = React.lazy(() => import('./components/Members/MembersPage'))
const AddMemberPage = React.lazy(() => import('./components/Members/AddMemberPage'))
const EditMemberPage = React.lazy(() => import('./components/Members/EditMemberPage'))
const SubscriptionsPage = React.lazy(() => import('./components/Subscriptions/SubscriptionsPage'))
const AddSubscriptionPage = React.lazy(() => import('./components/Subscriptions/AddSubscriptionPage'))
const ScannerPage = React.lazy(() => import('./components/Members/ScannerPage'))
const PaymentsPage = React.lazy(() => import('./components/Payments/PaymentsPage'))
const AddPaymentPage = React.lazy(() => import('./components/Payments/AddPaymentPage'))
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'))
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'))
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'))
const StoreManagerPage = React.lazy(() => import('./pages/StoreManagerPage'))
const SuperAdminPage = React.lazy(() => import('./pages/SuperAdminPage'))
const BillingPage = React.lazy(() => import('./pages/BillingPage'))
const SubscriptionStatusPage = React.lazy(() => import('./pages/SubscriptionStatusPage'))
const AttendancePage = React.lazy(() => import('./pages/AttendancePage'))
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'))
const HardwareStorePage = React.lazy(() => import('./pages/HardwareStorePage'))
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'))
const JoinGymPage = React.lazy(() => import('./pages/JoinGymPage'))

function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-6 gap-4 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-md animate-pulse" />
        <Logo className="w-12 h-12 relative z-10" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
          Loading Gymix...
        </p>
      </div>
    </div>
  )
}

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <NotificationProvider>
        <AppLayout>
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </AppLayout>
      </NotificationProvider>
    </ProtectedRoute>
  )
}

function RootRoute() {
  const { user, loading } = useAuth()
  
  // Check if forced to show the landing page via URL parameters
  const params = new URLSearchParams(window.location.search)
  const forceLanding = params.get('landing') === 'true' || params.get('home') === 'true'

  const isPlaystoreApp = sessionStorage.getItem('is_playstore_app') === 'true';
  const isNativeApp = isNativeCapacitorApp();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
        <LoadingScreen />
      </div>
    )
  }

  if (forceLanding) {
    return <LandingPage />
  }

  const isAdmin = user ? isSuperAdmin(user.email) : false;
  const destination = isAdmin ? '/super-admin' : '/dashboard';

  // Only force direct login/dashboard navigation for native apps or Play Store wrappers.
  // Standard web browser users (including desktop/mobile PWA) should see the Landing Page if logged out.
  if (isNativeApp || isPlaystoreApp) {
    return user ? <Navigate to={destination} replace /> : <Navigate to="/login" replace />
  }

  // If user is already logged in, automatically redirect browser users too
  if (user) {
    return <Navigate to={destination} replace />
  }

  return <LandingPage />
}

function DeepLinkHandler() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const pushInitialized = useRef(false)
  // Store listener handles so we can properly remove them on cleanup
  const deepLinkHandleRef = useRef(null)
  const backButtonHandleRef = useRef(null)

  // ── 1. Native deep link handler (com.gymix.fit://) ──
  useEffect(() => {
    if (!isNativeCapacitorApp()) return

    let cancelled = false

    import('@capacitor/app').then(({ App }) => {
      if (cancelled) return
      // App.addListener returns a Promise<PluginListenerHandle>
      App.addListener('appUrlOpen', (event) => {
        console.log('[DeepLinkHandler] App opened with URL:', event.url)
        try {
          const urlStr = event.url
          if (urlStr.includes('://signup') || urlStr.includes('://login') || urlStr.includes('://forgot-password') || urlStr.includes('://billing-success') || urlStr.includes('://dashboard')) {
            const match = urlStr.match(/:\/\/(signup|login|forgot-password|billing-success|dashboard)(\?.*)?/)
            if (match) {
              const path = match[1]
              const search = match[2] || ''
              const params = new URLSearchParams(search)
              const gym = params.get('gym')
              if (gym) {
                localStorage.setItem('scanned_gym_code', gym.trim().toUpperCase())
              }
              if (path === 'billing-success' || path === 'dashboard') {
                navigate('/dashboard', { replace: true })
                window.location.reload()
              } else {
                navigate(`/${path}${search}`, { replace: true })
              }
            }
          }
        } catch (e) {
          console.error('[DeepLinkHandler] Error parsing deep link:', e)
        }
      }).then(handle => {
        if (cancelled) {
          handle.remove()
          return
        }
        deepLinkHandleRef.current = handle
      })
    })

    return () => {
      cancelled = true
      if (deepLinkHandleRef.current) {
        deepLinkHandleRef.current.remove()
        deepLinkHandleRef.current = null
      }
    }
  }, [navigate])

  // ── 2. Clipboard gym code bridge (after Play Store install) ──
  useEffect(() => {
    const checkClipboardForGymCode = async () => {
      if (!isNativeCapacitorApp()) return
      try {
        const text = await navigator.clipboard.readText()
        if (text && text.trim().startsWith('gymix-connect:')) {
          const gymCode = text.replace('gymix-connect:', '').trim().toUpperCase()
          if (gymCode) {
            console.log('[DeepLinkHandler] Found gym connection code in clipboard:', gymCode)
            localStorage.setItem('scanned_gym_code', gymCode)
            await navigator.clipboard.writeText('')
            if (!user) {
              navigate(`/signup?gym=${gymCode}&role=member`, { replace: true })
            }
          }
        }
      } catch (err) {
        console.warn('[DeepLinkHandler] Clipboard read failed (expected on some devices):', err)
      }
    }
    const timer = setTimeout(checkClipboardForGymCode, 1500)
    return () => clearTimeout(timer)
  }, [navigate, user])

  // ── 3. Hardware back button (Android) ──
  useEffect(() => {
    if (!isNativeCapacitorApp()) return

    let cancelled = false

    import('@capacitor/app').then(({ App }) => {
      if (cancelled) return
      App.addListener('backButton', (data) => {
        console.log('[DeepLinkHandler] Hardware back button pressed. Can go back:', data.canGoBack)
        const backEvent = new CustomEvent('hardwareBack', { cancelable: true })
        const defaultPrevented = !window.dispatchEvent(backEvent)
        if (defaultPrevented) return
        const currentPath = window.location.pathname
        const exitRoutes = ['/dashboard', '/login', '/signup', '/']
        if (exitRoutes.includes(currentPath)) {
          App.exitApp()
        } else {
          navigate(-1)
        }
      }).then(handle => {
        if (cancelled) {
          handle.remove()
          return
        }
        backButtonHandleRef.current = handle
      })
    })

    return () => {
      cancelled = true
      if (backButtonHandleRef.current) {
        backButtonHandleRef.current.remove()
        backButtonHandleRef.current = null
      }
    }
  }, [navigate])

  // ── 4. Push Notifications initialization (runs when user logs in) ──
  useEffect(() => {
    if (!user) {
      pushInitialized.current = false
      return
    }
    if (pushInitialized.current) return
    pushInitialized.current = true

    pushNotificationService.initialize(
      user.id,
      // Foreground notification handler — show a toast when app is open
      (notification) => {
        const title = notification.title || 'Gymix'
        const body = notification.body || ''
        toast(body ? `${title}: ${body}` : title, {
          icon: '🔔',
          duration: 5000,
          className: 'gymix-toast',
          style: {
            background: '#18181b',
            color: '#fafafa',
            border: '1px solid #27272a',
            borderRadius: '14px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          },
        })
      }
    )

    // Navigate when user taps a notification (app was in background/closed)
    const handleNotificationTap = (e) => {
      const isMember = profile?.role === 'member'
      const fallbackRoute = isMember ? '/dashboard?tab=notifications' : '/notifications'
      const route = e.detail?.route || fallbackRoute
      navigate(route, { replace: true })
    }
    window.addEventListener('push-notification-tap', handleNotificationTap)
    return () => window.removeEventListener('push-notification-tap', handleNotificationTap)
  }, [user, profile, navigate])

  // ── 5. Remove push token on logout ──
  useEffect(() => {
    if (!user) {
      pushInitialized.current = false
    }
  }, [user])

  return null
}

export default function App() {
  // BUG #7 FIX: These side effects were running on every render.
  // Moved to useEffect so they run exactly once on mount.
  useEffect(() => {
    // ── MIGRATION CLEANUP ──
    // Previous versions stored this flag in localStorage (persistent across tabs/sessions).
    // This caused browser users to be incorrectly identified as Play Store app users.
    // We now use sessionStorage (per-tab, non-persistent). Remove any stale localStorage key.
    localStorage.removeItem('is_playstore_app')

    // Detect if app is launched via Google Play Store (appended query params)
    const params = new URLSearchParams(window.location.search)
    const isPlaystoreURL = params.get('utm_source') === 'playstore' || params.get('mode') === 'android_app'
    if (isPlaystoreURL) {
      sessionStorage.setItem('is_playstore_app', 'true')
    }
  }, [])

  // Push notification initialization is handled inside DeepLinkHandler
  // after user auth state is confirmed (to associate the FCM token with the user).

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster 
          position="top-right"
          toastOptions={{
            className: '!bg-white dark:!bg-zinc-900 !text-slate-900 dark:!text-zinc-100 !border !border-slate-200 dark:!border-zinc-800 !rounded-2xl !shadow-xl !text-xs !font-medium',
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <AuthProvider>
          <GymProvider>
            <DeepLinkHandler />
            <AppUpdateChecker />
            <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#09090b]"><LoadingScreen /></div>}>
              <Routes>
                {/* ── Public ── */}
                <Route path="/" element={<RootRoute />} />
                <Route path="/home" element={<LandingPage />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/signup" element={<AuthPage />} />
                <Route path="/owner-signup" element={<AuthPage />} />
                <Route path="/forgot-password" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/hardware" element={<Protected><HardwareStorePage /></Protected>} />
                <Route path="/join" element={<JoinGymPage />} />
                <Route path="/join/:gymCode" element={<JoinGymPage />} />
                
                {/* ── Protected: Gym Owner & Athletes ── */}
                <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
                <Route path="/scanner" element={<Protected><ScannerPage /></Protected>} />
                <Route path="/leaderboard" element={<Protected><LeaderboardPage /></Protected>} />
                <Route path="/store" element={<Protected><HardwareStorePage /></Protected>} />
                <Route path="/members" element={<Protected><MembersPage /></Protected>} />
                <Route path="/members/new" element={<Protected><AddMemberPage /></Protected>} />
                <Route path="/members/:id/edit" element={<Protected><EditMemberPage /></Protected>} />
                
                <Route path="/subscriptions" element={<Protected><SubscriptionsPage /></Protected>} />
                <Route path="/subscriptions/new" element={<Protected><AddSubscriptionPage /></Protected>} />
                
                <Route path="/payments" element={<Protected><PaymentsPage /></Protected>} />
                <Route path="/payments/new" element={<Protected><AddPaymentPage /></Protected>} />

                <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
                <Route path="/store-manager" element={<Protected><StoreManagerPage /></Protected>} />
                <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
                <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
                <Route path="/billing" element={<Protected><BillingPage /></Protected>} />
                <Route path="/subscription-status" element={<Protected><SubscriptionStatusPage /></Protected>} />
                <Route path="/attendance" element={<Protected><AttendancePage /></Protected>} />
                <Route path="/super-admin" element={<Protected><SuperAdminRoute><SuperAdminPage /></SuperAdminRoute></Protected>} />

                {/* ── Catch-all ── */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </GymProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
