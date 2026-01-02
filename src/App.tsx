import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { FeatureDashboard } from './pages/FeatureDashboard'
// import { Dashboard } from './pages/Dashboard'
import { Game } from './pages/Game'
import { CasinoLobby } from './pages/CasinoLobby'
import { Aviator } from './pages/games/Aviator'
import { Coinflip } from './pages/games/Coinflip'
import { Dice } from './pages/games/Dice'
import { Mines } from './pages/games/Mines'
import { Wheel } from './pages/games/Wheel'
import './App.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <span className="loading-logo">🎰</span>
          <div className="loading-spinner"></div>
          <p>Loading ZimBet...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter basename="/zimbet">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
