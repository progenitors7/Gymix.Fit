import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Prevent Safari/Chrome mobile pinch-to-zoom gestures
if (typeof window !== 'undefined') {
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
