import React, { Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { GymProvider } from './context/GymProvider'
import { NotificationProvider } from './context/NotificationProvider'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import AppLayout from './components/Layout/AppLayout'
import ErrorBoundary from './components/Common/ErrorBoundary'
import SuperAdminRoute from './components/Layout/SuperAdminRoute'
import Logo from './components/UI/Logo'
import { motion } from 'framer-motion'
import { useAuth } from './hooks/useAuth'
import { Toaster, toast } from 'react-hot-toast'
import { pushNotificationService } from './services/pushNotificationService'


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
    <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[50vh] gap-4">
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.5, 1, 0.5] 
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Logo className="w-12 h-12 drop-shadow-[0_0_15px_rgba(134,59,255,0.3)]" />
      </motion.div>
      <div className="w-8 h-1 border-2 border-white/5 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-[#863BFF]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
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
  
  // Check if launched as a standalone PWA or native app
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                window.navigator.standalone === true || 
                window.Capacitor !== undefined;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F1117]">
        <LoadingScreen />
      </div>
    )
  }

  if (isPWA) {
    return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
  }

  // If user is already logged in, automatically redirect browser users to dashboard too
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <LandingPage />
}

function DeepLinkHandler() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const pushInitialized = useRef(false)

  // ── 1. Native deep link handler (com.gymix.fit://) ──
  useEffect(() => {
    if (window.Capacitor) {
      import('@capacitor/app').then(({ App }) => {
        const handler = App.addListener('appUrlOpen', (event) => {
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
        })
        return () => {
          handler.then(h => h.remove())
        }
      })
    }
  }, [navigate])

  // ── 2. Clipboard gym code bridge (after Play Store install) ──
  useEffect(() => {
    const checkClipboardForGymCode = async () => {
      if (!window.Capacitor) return
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
    if (window.Capacitor) {
      import('@capacitor/app').then(({ App }) => {
        const handler = App.addListener('backButton', (data) => {
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
        })
        return () => {
          handler.then(h => h.remove())
        }
      })
    }
  }, [navigate])

  // ── 4. Push Notifications initialization (runs when user logs in) ──
  useEffect(() => {
    if (!user || pushInitialized.current) return
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
          style: {
            background: '#1A1F2B',
            color: '#fff',
            border: '1px solid rgba(134,59,255,0.3)',
            borderRadius: '16px',
          },
        })
      }
    )

    // Navigate when user taps a notification (app was in background/closed)
    const handleNotificationTap = (e) => {
      const route = e.detail?.route || '/notifications'
      navigate(route, { replace: true })
    }
    window.addEventListener('push-notification-tap', handleNotificationTap)
    return () => window.removeEventListener('push-notification-tap', handleNotificationTap)
  }, [user, navigate])

  // ── 5. Remove push token on logout ──
  useEffect(() => {
    if (!user) {
      pushInitialized.current = false
    }
  }, [user])

  return null
}

export default function App() {
  // Detect if app is launched via Google Play Store (appended query params)
  const params = new URLSearchParams(window.location.search);
  if (params.get('utm_source') === 'playstore' || params.get('mode') === 'android_app') {
    localStorage.setItem('is_playstore_app', 'true');
  }

  // Push notification initialization is handled inside DeepLinkHandler
  // after user auth state is confirmed (to associate the FCM token with the user).

  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1F2B',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
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
          <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#1c1c1c]"><LoadingScreen /></div>}>
            <Routes>
              {/* ── Public ── */}
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />
              <Route path="/owner-signup" element={<AuthPage />} />
              <Route path="/forgot-password" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/hardware" element={<HardwareStorePage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/join/:gymCode" element={<JoinGymPage />} />

            {/* ── Protected ── */}
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/leaderboard"      element={<Protected><LeaderboardPage /></Protected>} />
            <Route path="/members"          element={<Protected><MembersPage /></Protected>} />
            <Route path="/members/new"      element={<Protected><AddMemberPage /></Protected>} />
            <Route path="/members/:id/edit" element={<Protected><EditMemberPage /></Protected>} />
            <Route path="/scanner"          element={<Protected><ScannerPage /></Protected>} />
            
            <Route path="/subscriptions"     element={<Protected><SubscriptionsPage /></Protected>} />
            <Route path="/subscriptions/new" element={<Protected><AddSubscriptionPage /></Protected>} />
            
            <Route path="/payments"          element={<Protected><PaymentsPage /></Protected>} />
            <Route path="/payments/new"      element={<Protected><AddPaymentPage /></Protected>} />

            <Route path="/notifications"     element={<Protected><NotificationsPage /></Protected>} />
            <Route path="/store-manager"     element={<Protected><StoreManagerPage /></Protected>} />
            <Route path="/settings"          element={<Protected><SettingsPage /></Protected>} />
            <Route path="/profile"           element={<Protected><ProfilePage /></Protected>} />
            <Route path="/billing"           element={<Protected><BillingPage /></Protected>} />
            <Route path="/subscription-status" element={<Protected><SubscriptionStatusPage /></Protected>} />
            <Route path="/attendance"        element={<Protected><AttendancePage /></Protected>} />
            <Route path="/super-admin"      element={<Protected><SuperAdminRoute><SuperAdminPage /></SuperAdminRoute></Protected>} />

            {/* ── Catch-all ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </GymProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
