import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import { MobileNav } from './components/MobileNav'
import './App.css'

// Helper for cleaner lazy imports of named exports
const lazyLoad = <T extends React.ComponentType>(
  importFn: () => Promise<{ [key: string]: T }>,
  exportName: string
) => lazy(() => importFn().then(m => ({ default: m[exportName] as T })))

// Lazy Load ALL Pages for Efficiency
const Login = lazyLoad(() => import('./pages/Login'), 'Login')
const Landing = lazyLoad(() => import('./pages/Landing'), 'Landing')
const FeatureDashboard = lazyLoad(() => import('./pages/FeatureDashboard'), 'FeatureDashboard')
const SetupAccount = lazyLoad(() => import('./pages/SetupAccount'), 'SetupAccount')
const Game = lazyLoad(() => import('./pages/Game'), 'Game')
const CasinoLobby = lazyLoad(() => import('./pages/CasinoLobby'), 'CasinoLobby')
const Aviator = lazyLoad(() => import('./pages/games/Aviator'), 'Aviator')
const Coinflip = lazyLoad(() => import('./pages/games/Coinflip'), 'Coinflip')
const Dice = lazyLoad(() => import('./pages/games/Dice'), 'Dice')
const Mines = lazyLoad(() => import('./pages/games/Mines'), 'Mines')
const Wheel = lazyLoad(() => import('./pages/games/Wheel'), 'Wheel')
const Plinko = lazyLoad(() => import('./pages/games/Plinko'), 'Plinko')


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

