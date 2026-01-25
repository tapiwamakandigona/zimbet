import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './SetupAccount.css'

export function SetupAccount() {
    const { createZimBetAccount, zimBetAccount, signOut } = useAuth()
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Redirect if already has account - using useEffect to avoid render-time navigation
    useEffect(() => {
        if (zimBetAccount) {
            navigate('/dashboard', { replace: true })
        }
    }, [zimBetAccount, navigate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = username.trim()

        if (!trimmed) {
            setError('Please enter a username')
            return
        }

        if (trimmed.length < 3) {
            setError('Username must be at least 3 characters')
            return
        }

        setLoading(true)
        setError('')

        const { error } = await createZimBetAccount(trimmed)

        if (error) {
            // Handle common errors
            let msg = error.message
            if (msg.includes('duplicate') || msg.includes('already exists')) {
                msg = 'This username is taken. Try another!'
            }
            setError(msg)
            setLoading(false)
        } else {
            // Success - redirect happens via useEffect when zimBetAccount updates
        }
    }

    // Don't render if redirecting
    if (zimBetAccount) {
        return null
    }

    return (
        <div className="setup-page">
            <div className="setup-container">
                <div className="setup-header">
                    <div className="setup-icon">🎁</div>
                    <h1>Welcome to ZimBet!</h1>
                    <p>Let's get you set up to start playing</p>
                </div>

                <div className="bonus-card">
                    <div className="bonus-badge">🎉 NEW PLAYER BONUS</div>
                    <div className="bonus-amount">$100</div>
                    <div className="bonus-label">FREE Credits to Start</div>
                </div>

                <form onSubmit={handleSubmit} className="setup-form">
                    <div className="form-group">
                        <label>Pick Your Player Name</label>
                        <div className="input-prefix-group">
                            <span className="prefix">@</span>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                                placeholder="coolplayer"
                                maxLength={12}
                                autoFocus
                                required
                            />
                        </div>
                        <p className="hint">3-12 characters. Letters, numbers, underscores only.</p>
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    <button type="submit" className="btn-setup" disabled={loading || username.trim().length < 3}>
                        {loading ? 'Creating Account...' : 'Claim $100 & Start Playing'}
                    </button>
                </form>

                <div className="setup-footer">
                    <p>By continuing, you agree to play responsibly 🎮</p>
                    <button
                        onClick={() => {
                            signOut()
                            navigate('/login')
                        }}
                        className="text-gray-500 text-sm mt-4 hover:text-white underline bg-transparent border-none cursor-pointer"
                        style={{ marginTop: '20px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Not you? Sign Out
                    </button>
                </div>
            </div>
        </div>
    )
}
