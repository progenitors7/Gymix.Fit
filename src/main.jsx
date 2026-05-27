import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Prevent Safari/Chrome mobile pinch-to-zoom gestures
if (typeof window !== 'undefined') {
  sessionStorage.removeItem('reload-attempts')
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault()
  })
  document.addEventListener('gesturechange', (e) => {
    e.preventDefault()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Automatically reload the page when a new service worker version is installed and activated.
// This ensures SaaS users always get the latest updates instantly without clearing cache manually.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false
  const hadController = !!navigator.serviceWorker.controller

  // Listen for the controllerchange event, which fires when a new service worker takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    if (hadController) {
      refreshing = true
      window.location.reload()
    }
  })

  // Periodically check for updates in the background
  navigator.serviceWorker.ready.then((registration) => {
    // Check immediately on load
    registration.update().catch((err) => console.error('SW update check failed:', err))

    // Check every 5 minutes
    const intervalId = setInterval(() => {
      registration.update().catch((err) => console.error('SW periodic update check failed:', err))
    }, 1000 * 60 * 5)

    // Check when user focuses/resumes the app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch((err) => console.error('SW visible update check failed:', err))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup listener on unload
    window.addEventListener('beforeunload', () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
  }).catch((err) => console.error('SW ready failed:', err))
}

