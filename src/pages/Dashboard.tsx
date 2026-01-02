import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, BET_TIERS } from '../lib/supabase'
import type { BetTier } from '../lib/supabase'
import { Leaderboard } from '../components/Leaderboard'
import './Dashboard.css'

type BetPoolCount = {
    [key: number]: number
}

export function Dashboard() {
    const { user, zimBetAccount, signOut, createZimBetAccount } = useAuth()
    const navigate = useNavigate()


    const [newUsername, setNewUsername] = useState('')
    const [usernameError, setUsernameError] = useState('')
    const [creating, setCreating] = useState(false)
    const [betPoolCounts, setBetPoolCounts] = useState<BetPoolCount>({})
    const [activeTab, setActiveTab] = useState<'play' | 'leaderboard' | 'wallet'>('play')

    useEffect(() => {
        if (!user) {
            navigate('/login')
            return
        }

        // Fetch waiting players count for each bet tier
        fetchBetPoolCounts()

        // Subscribe to real-time updates
        const subscription = supabase
            .channel('bet_pools')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'zimbet_matches' },
                () => fetchBetPoolCounts()
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [user, navigate])

    const fetchBetPoolCounts = async () => {
        const counts: BetPoolCount = {}

        for (const tier of BET_TIERS) {
            const { count } = await supabase
                .from('zimbet_matches')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'waiting')
                .eq('bet_amount', tier)

            counts[tier] = count || 0
        }

        setBetPoolCounts(counts)
    }

    const handleCreateAccount = async () => {
        const trimmed = newUsername.trim().toLowerCase().replace(/^zm-/, '')

        if (!trimmed) {
            setUsernameError('Username is required')
            return
        }
        if (trimmed.length < 3) {
            setUsernameError('Username must be at least 3 characters')
            return
        }
        if (trimmed.length > 15) {
            setUsernameError('Username must be 15 characters or less')
            return
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
            setUsernameError('Only letters, numbers, and underscores allowed')
            return
        }
        if (/^[0-9]/.test(trimmed)) {
            setUsernameError('Username cannot start with a number')
            return
        }

        setCreating(true)
        setUsernameError('')

        try {
            const { error } = await createZimBetAccount(trimmed)

            if (error) {
                if (error.message.includes('duplicate') || error.message.includes('unique')) {
                    setUsernameError('Username already taken, try another')
                } else if (error.message.includes('permission') || error.message.includes('policy')) {
                    setUsernameError('Permission denied. Please re-login.')
                } else {
                    setUsernameError(error.message || 'Failed to create account')
                }
            }
        } catch (err) {
            setUsernameError('Network error. Please try again.')
        } finally {
            setCreating(false)
        }
    }

    const handleSelectBet = (tier: BetTier) => {
        if (!zimBetAccount) return

        if (zimBetAccount.balance < tier) {
            alert(`Insufficient balance! You need $${tier} to place this bet.`)
            return
        }

        navigate(`/game?bet=${tier}`)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount)
    }

    // Show create account screen if user doesn't have ZimBet account
    if (user && !zimBetAccount) {
        return (
            <div className="dashboard create-account-view">
                <div className="create-account-container">
                    <div className="logo-section">
                        <span className="logo">🎰</span>
                        <h1>Welcome to ZimBet!</h1>
                        <p>Create your betting account to get started</p>
                    </div>

                    <div className="create-form glass-card">
                        <h2>Choose Your Username</h2>
                        <p>This will be displayed on the leaderboard</p>

                        {usernameError && <div className="error-msg">{usernameError}</div>}

                        <div className="username-input-wrapper">
                            <span className="prefix">zm-</span>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                placeholder="your_username"
                                maxLength={15}
                            />
                        </div>
                        <p className="preview-text">Your username: <strong>zm-{newUsername || 'username'}</strong></p>

                        <button
                            className="btn-primary"
                            onClick={handleCreateAccount}
                            disabled={creating || newUsername.length < 3}
                        >
                            {creating ? 'Creating...' : 'Create Account'}
                        </button>

                        <button className="btn-secondary" onClick={signOut}>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <span className="logo">🎰</span>
                    <span className="brand">ZimBet</span>
                </div>
                <div className="header-right">
                    <div className="balance-badge">
                        <span className="balance-icon">💰</span>
                        <span className="balance-amount">{formatCurrency(zimBetAccount?.balance || 0)}</span>
                    </div>
                    <button className="btn-icon" onClick={signOut}>🚪</button>
                </div>
            </header>

            {/* Main Content */}
            <main className="dashboard-main">
                {/* User Card */}
                <section className="user-card glass-card">
                    <div className="user-avatar">
                        {zimBetAccount?.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                        <h2>@{zimBetAccount?.username}</h2>
                        <div className="user-stats">
                            <span className="stat">
                                <span className="stat-value">{zimBetAccount?.total_wins || 0}</span>
                                <span className="stat-label">Wins</span>
                            </span>
                            <span className="stat">
                                <span className="stat-value">{zimBetAccount?.total_losses || 0}</span>
                                <span className="stat-label">Losses</span>
                            </span>
                            <span className="stat">
                                <span className="stat-value">{formatCurrency(zimBetAccount?.total_earnings || 0)}</span>
                                <span className="stat-label">Earnings</span>
                            </span>
                        </div>
                    </div>
                </section>

                {/* Tab Navigation */}
                <nav className="tab-nav">
                    <button
                        className={`tab ${activeTab === 'play' ? 'active' : ''}`}
                        onClick={() => setActiveTab('play')}
                    >
                        🎮 Play
                    </button>
                    <button
                        className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('leaderboard')}
                    >
                        🏆 Leaderboard
                    </button>
                    <button
                        className={`tab ${activeTab === 'wallet' ? 'active' : ''}`}
                        onClick={() => setActiveTab('wallet')}
                    >
                        💳 Wallet
                    </button>
                </nav>

                {/* Play Tab */}
                {activeTab === 'play' && (
                    <section className="play-section">
                        <h3>Select Bet Amount</h3>
                        <p className="section-desc">Choose a bet tier to find an opponent</p>

                        <div className="bet-grid">
                            {BET_TIERS.map((tier) => (
                                <button
                                    key={tier}
                                    className={`bet-card ${zimBetAccount && zimBetAccount.balance >= tier ? '' : 'disabled'}`}
                                    onClick={() => handleSelectBet(tier)}
                                    disabled={!zimBetAccount || zimBetAccount.balance < tier}
                                >
                                    <span className="bet-amount">${tier}</span>
                                    <span className="bet-players">
                                        {betPoolCounts[tier] || 0} waiting
                                    </span>
                                    <span className="bet-potential">
                                        Win: ${tier * 2 * 0.9}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="game-rules glass-card">
                            <h4>📋 How It Works</h4>
                            <ul>
                                <li>🔍 Wait up to 20 seconds for an opponent</li>
                                <li>✊ You have 10 seconds to choose Rock, Paper, or Scissors</li>
                                <li>🏆 Winner takes 90% of the pot (10% house fee)</li>
                                <li>🤖 No opponent? Play against the bot!</li>
                            </ul>
                        </div>
                    </section>
                )}

                {/* Leaderboard Tab */}
                {activeTab === 'leaderboard' && (
                    <section className="leaderboard-section">
                        <h3>🏆 Leaderboard</h3>
                        <p className="section-desc">Top players on ZimBet</p>

                        <Leaderboard />
                    </section>
                )}

                {/* Wallet Tab */}
                {activeTab === 'wallet' && (
                    <section className="wallet-section">
                        <h3>💳 Wallet</h3>

                        <div className="wallet-balance glass-card">
                            <span className="wallet-label">Current Balance</span>
                            <span className="wallet-amount">{formatCurrency(zimBetAccount?.balance || 0)}</span>
                        </div>

                        <div className="wallet-actions">
                            <div className="wallet-action glass-card">
                                <h4>➕ Add Funds</h4>
                                <p>Fund your ZimBet account from ZimPay</p>
                                <a
                                    href="https://tapiwamakandigona.github.io/zimpay/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary"
                                >
                                    Open ZimPay
                                </a>
                                <p className="help-text">
                                    Send funds to username: <strong>@{zimBetAccount?.username}</strong>
                                </p>
                            </div>

                            <div className="wallet-action glass-card">
                                <h4>➖ Withdraw</h4>
                                <p>Send winnings back to ZimPay</p>
                                <button className="btn-secondary" disabled>
                                    Coming Soon
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}
