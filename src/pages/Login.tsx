import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export function Login() {
    const { signIn } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(true)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

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

        // Save or clear email based on remember me
        if (rememberMe) {
            localStorage.setItem('zimbet_email', email)
            localStorage.setItem('zimbet_remember', 'true')
        } else {
            localStorage.removeItem('zimbet_email')
            localStorage.removeItem('zimbet_remember')
        }

        const { error } = await signIn(email, password, rememberMe)

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            navigate('/dashboard')
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="logo">🎰</div>
                    <h1>ZimBet</h1>
                    <p className="subtitle">Rock Paper Scissors Betting</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <h2>Login with ZimPay</h2>
                    <p className="form-desc">Use your ZimPay credentials to continue</p>

                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="form-group remember-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            Keep me logged in
                        </label>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In with ZimPay'}
                    </button>

                    <p className="register-link">
                        Don't have a ZimPay account?{' '}
                        <a href="https://tapiwamakandigona.github.io/zimpay/" target="_blank" rel="noopener noreferrer">
                            Create one here
                        </a>
                    </p>
                </form>

                <div className="disclaimer">
                    <p>🎮 Play responsibly. This is a simulation game.</p>
                </div>
            </div>
        </div>
    )
}
