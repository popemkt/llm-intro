import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { HomePage } from './pages/HomePage'
import { PresentationPage } from './pages/PresentationPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/p/:id" element={<PresentationPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
