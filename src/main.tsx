import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { applyAppTheme, getStoredAppTheme } from './lib/appTheme'

// Apply saved app theme before first render to avoid flash
applyAppTheme(getStoredAppTheme())
import { HomePage } from './pages/HomePage'
import { PresentationPage } from './pages/PresentationPage'
import { SlideEditorPage } from './pages/SlideEditorPage'
import { SettingsPage } from './pages/SettingsPage'
import { AppSettingsPage } from './pages/AppSettingsPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/p/:id" element={<PresentationPage />} />
        <Route path="/p/:id/edit/:sid" element={<SlideEditorPage />} />
        <Route path="/p/:id/settings" element={<SettingsPage />} />
        <Route path="/settings" element={<AppSettingsPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
