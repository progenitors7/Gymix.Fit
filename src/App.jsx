import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { Toaster } from 'react-hot-toast'


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
const StoreManagerPage = React.lazy(() => import('./pages/StoreManagerPage'))
const SuperAdminPage = React.lazy(() => import('./pages/SuperAdminPage'))
const BillingPage = React.lazy(() => import('./pages/BillingPage'))
const AttendancePage = React.lazy(() => import('./pages/AttendancePage'))
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'))
const HardwareStorePage = React.lazy(() => import('./pages/HardwareStorePage'))
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'))

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

export default function App() {
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
          <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#1c1c1c]"><LoadingScreen /></div>}>
            <Routes>
              {/* ── Public ── */}
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />
              <Route path="/forgot-password" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/hardware" element={<HardwareStorePage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />

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
            <Route path="/billing"           element={<Protected><BillingPage /></Protected>} />
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
