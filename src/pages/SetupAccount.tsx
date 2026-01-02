import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './SetupAccount.css'

export function SetupAccount() {
    const { createZimBetAccount, zimBetAccount } = useAuth()
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Redirect if already set up
    if (zimBetAccount) {
        navigate('/dashboard')
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username.trim()) return

        setLoading(true)
        setError('')

        const { error } = await createZimBetAccount(username)

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // Success - Redirect happens via AuthContext state change or manual
            navigate('/dashboard')
        }
    }

    return (
        <div className="setup-page">
            <div className="setup-container">
                <div className="setup-header">
                    <div className="setup-icon">🚀</div>
                    <h1>Welcome to ZimBet</h1>
                    <p>You're almost ready to play!</p>
                </div>

                <div className="bonus-card">
                    <div className="bonus-amount">$100</div>
                    <div className="bonus-label">Starting Bonus Applied</div>
                </div>

                <form onSubmit={handleSubmit} className="setup-form">
                    <div className="form-group">
                        <label>Choose your Gamer Tag</label>
                        <div className="input-prefix-group">
                            <span className="prefix">@</span>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                placeholder="username"
                                maxLength={12}
                                required
                            />
                        </div>
                        <p className="hint">Only letters, numbers, and underscores.</p>
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    <button type="submit" className="btn-setup" disabled={loading}>
                        {loading ? 'Setting up...' : 'Claim Bonus & Start Playing'}
                    </button>
                </form>
            </div>
        </div>
    )
}
