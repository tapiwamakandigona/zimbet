import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export function Login() {
    const { signIn, user, zimBetAccount, loading: authLoading } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Auto-redirect if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            if (zimBetAccount) {
                navigate('/dashboard', { replace: true })
            } else {
                navigate('/setup', { replace: true })
            }
        }
    }, [user, zimBetAccount, authLoading, navigate])

    // Load remembered email on mount
    useEffect(() => {
        const savedEmail = localStorage.getItem('zimbet_email')
        if (savedEmail) {
            setEmail(savedEmail)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Basic validation
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password')
            setLoading(false)
            return
        }

        // Save or clear email based on remember me
        if (rememberMe) {
            localStorage.setItem('zimbet_email', email)
        } else {
            localStorage.removeItem('zimbet_email')
        }

        const { error } = await signIn(email, password, rememberMe)

        if (error) {
            // Clean up error message for common cases
            let msg = error.message
            if (msg.includes('Invalid login')) {
                msg = 'Invalid email or password'
            }
            setError(msg)
            setLoading(false)
        } else {
            // Navigation happens via useEffect when user state updates
        }
    }

    // Don't render form if auth is loading or user is logged in
    if (authLoading) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-header">
                        <div className="logo">🎰</div>
                        <h1>ZimBet</h1>
                    </div>
                    <div style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="logo">🎰</div>
                    <h1>ZimBet</h1>
                    <p className="subtitle">Premium Casino Experience</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <h2>Welcome Back</h2>
                    <p className="form-desc">Sign in with your ZimPay credentials</p>

                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div className="form-group remember-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            Keep me logged in
                        </label>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <p className="register-link">
                        New to ZimPay?{' '}
                        <a href="https://tapiwamakandigona.github.io/zimpay/#/signup" target="_blank" rel="noopener noreferrer">
                            Create account
                        </a>
                    </p>
                </form>

                <div className="disclaimer">
                    <p>🎮 Play responsibly. This is a simulation.</p>
                </div>

                <div className="back-link">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/') }}>← Back to Home</a>
                </div>
            </div>
        </div>
    )
}
