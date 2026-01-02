import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import { MobileNav } from './components/MobileNav'
import { Login } from './pages/Login'
import './App.css'

// Lazy Load Pages for Efficiency
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })))
const FeatureDashboard = lazy(() => import('./pages/FeatureDashboard').then(m => ({ default: m.FeatureDashboard })))
const SetupAccount = lazy(() => import('./pages/SetupAccount').then(m => ({ default: m.SetupAccount })))
const Game = lazy(() => import('./pages/Game').then(m => ({ default: m.Game })))
const CasinoLobby = lazy(() => import('./pages/CasinoLobby').then(m => ({ default: m.CasinoLobby })))
const Aviator = lazy(() => import('./pages/games/Aviator').then(m => ({ default: m.Aviator })))
const Coinflip = lazy(() => import('./pages/games/Coinflip').then(m => ({ default: m.Coinflip })))
const Dice = lazy(() => import('./pages/games/Dice').then(m => ({ default: m.Dice })))
const Mines = lazy(() => import('./pages/games/Mines').then(m => ({ default: m.Mines })))
const Wheel = lazy(() => import('./pages/games/Wheel').then(m => ({ default: m.Wheel })))
const Plinko = lazy(() => import('./pages/games/Plinko').then(m => ({ default: m.Plinko })))

function LoadingScreen({ msg }: { msg?: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <span className="loading-logo">🎰</span>
        <div className="loading-spinner"></div>
        <p>{msg || 'Loading ZimBet...'}</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, zimBetAccount } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Force Account Setup (Claim Bonus)
  if (!zimBetAccount && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const location = useLocation()
  const showMobileNav = !['/login', '/setup', '/'].includes(location.pathname)

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route path="/setup" element={
            <ProtectedRoute>
              <SetupAccount />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <FeatureDashboard />
            </ProtectedRoute>
          } />
          <Route path="/game" element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          } />
          <Route path="/casino" element={
            <ProtectedRoute>
              <CasinoLobby />
            </ProtectedRoute>
          } />
          <Route path="/casino/aviator" element={
            <ProtectedRoute>
              <Aviator />
            </ProtectedRoute>
          } />
          <Route path="/casino/coinflip" element={
            <ProtectedRoute>
              <Coinflip />
            </ProtectedRoute>
          } />
          <Route path="/casino/dice" element={
            <ProtectedRoute>
              <Dice />
            </ProtectedRoute>
          } />
          <Route path="/casino/mines" element={
            <ProtectedRoute>
              <Mines />
            </ProtectedRoute>
          } />
          <Route path="/casino/wheel" element={
            <ProtectedRoute>
              <Wheel />
            </ProtectedRoute>
          } />
          <Route path="/casino/plinko" element={
            <ProtectedRoute>
              <Plinko />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {showMobileNav && <MobileNav />}
    </>
  )
}

function App() {
  return (
    <BrowserRouter basename="/zimbet">
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App

