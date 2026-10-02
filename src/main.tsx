import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

/* Self-hosted fonts — no external requests, no layout shift on first paint. */
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'

import '@/index.css'
import { App } from '@/app/App'
import { useApp } from '@/store/app'

/* ----------------------------------------------------------------------------
   BOOT
   The theme is dark-only by design. Motion and contrast are driven by data
   attributes on <html>, set before paint so there is no flash of the wrong
   state, and kept in sync with the OS reduced-motion preference.
   -------------------------------------------------------------------------- */
const root = document.documentElement
root.dataset.motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full'
root.dataset.contrast = 'normal'
root.dataset.theme = 'dark'

/* Remove the static boot spinner once React has committed its first frame. */
const boot = document.getElementById('boot')
if (boot) {
  boot.style.transition = 'opacity 220ms ease'
  boot.style.opacity = '0'
  window.setTimeout(() => boot.remove(), 260)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

/* Keep the attribute layer in sync with the store's preferences. */
const applyPreferences = (state: { motion: string; contrast: string }) => {
  root.dataset.motion = state.motion
  root.dataset.contrast = state.contrast
}
applyPreferences(useApp.getState())
useApp.subscribe(applyPreferences)
