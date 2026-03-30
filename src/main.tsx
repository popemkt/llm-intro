import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { applyAppTheme, getStoredAppTheme } from './lib/appTheme'

// Apply saved app theme before first render to avoid flash
applyAppTheme(getStoredAppTheme())

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const PresentationPage = lazy(() => import('./pages/PresentationPage').then((module) => ({ default: module.PresentationPage })))
const SlideEditorPage = lazy(() => import('./pages/SlideEditorPage').then((module) => ({ default: module.SlideEditorPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const AppSettingsPage = lazy(() => import('./pages/AppSettingsPage').then((module) => ({ default: module.AppSettingsPage })))

function RouteFallback() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', color: 'var(--color-text-dim)', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
      Loading…
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/p/:id" element={<PresentationPage />} />
          <Route path="/p/:id/edit/:sid" element={<SlideEditorPage />} />
          <Route path="/p/:id/settings" element={<SettingsPage />} />
          <Route path="/settings" element={<AppSettingsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
