import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Wallet } from '../components/Wallet'
import { Leaderboard } from '../components/Leaderboard'
import { DailyBonus } from '../components/DailyBonus'
import './FeatureDashboard.css'

import { soundManager } from '../lib/audio'

// Helper to format username (remove zm- prefix for display)
function formatUsername(username: string): string {
    return username.replace(/^zm-/i, '')
}

export function FeatureDashboard() {
    const { zimBetAccount, signOut } = useAuth()
    const navigate = useNavigate()
    const [view, setView] = useState<'games' | 'wallet' | 'leaderboard'>('games')
    const [muted, setMuted] = useState(soundManager.isMuted())

    const toggleMute = () => {
        setMuted(soundManager.toggleMute())
    }

    const GAMES = [
        { id: 'aviator', name: 'Aviator', desc: 'Predict the crash point', image: '✈️', color: '#e23333', link: '/casino/aviator', hot: true },
        { id: 'mines', name: 'Mines', desc: 'Avoid the bombs', image: '💎', color: '#f59e0b', link: '/casino/mines' },
        { id: 'dice', name: 'Dice', desc: 'Roll high or low', image: '🎲', color: '#3b82f6', link: '/casino/dice' },
        { id: 'coinflip', name: 'Coin Flip', desc: 'Heads or Tails?', image: '🪙', color: '#10b981', link: '/casino/coinflip' },
        { id: 'wheel', name: 'Wheel', desc: 'Spin to win big', image: '🎡', color: '#8b5cf6', link: '/casino/wheel' },
        { id: 'plinko', name: 'Plinko', desc: 'Drop the ball to win', image: '🎯', color: '#ec4899', link: '/casino/plinko', new: true },
    ]

    const displayUsername = zimBetAccount ? formatUsername(zimBetAccount.username) : 'Player'

    return (
        <div className="feature-dashboard">
            {/* MOBILE HEADER */}
            <div className="fd-mobile-header">
                <div className="fd-brand" onClick={() => setView('games')}>
                    <span className="fd-brand-icon">🎰</span>
                    <span>ZimBet</span>
                </div>
                <div className="fd-mobile-right">
                    <div className="fd-mobile-balance">
                        ${zimBetAccount ? Math.floor(zimBetAccount.balance).toLocaleString() : 0}
                    </div>
                    <div className="fd-avatar" onClick={() => setView('wallet')}>
                        {displayUsername.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>

            {/* SIDEBAR */}
            <div className="fd-sidebar">
                <div className="fd-brand" onClick={() => navigate('/')}>
                    <span className="fd-brand-icon">🎰</span>
                    <span>ZimBet</span>
                </div>

                <nav className="fd-nav">
                    <button
                        className={`fd-nav-item ${view === 'games' ? 'active' : ''}`}
                        onClick={() => setView('games')}
                    >
                        <span>🎮</span> Games
                    </button>
                    <button
                        className={`fd-nav-item ${view === 'leaderboard' ? 'active' : ''}`}
                        onClick={() => setView('leaderboard')}
                    >
                        <span>🏆</span> Leaderboard
                    </button>
                    <button
                        className={`fd-nav-item ${view === 'wallet' ? 'active' : ''}`}
                        onClick={() => setView('wallet')}
                    >
                        <span>💳</span> Wallet
                    </button>
                    <div style={{ flex: 1 }}></div>
                    <button className="fd-nav-item" onClick={toggleMute}>
                        <span>{muted ? '🔇' : '🔊'}</span> {muted ? 'Unmute' : 'Mute'}
                    </button>
                    <button className="fd-nav-item logout" onClick={signOut}>
                        <span>🚪</span> Sign Out
                    </button>
                </nav>

                {zimBetAccount && (
                    <div className="fd-user-section">
                        <div className="fd-user-card">
                            <div className="fd-avatar">
                                {displayUsername.charAt(0).toUpperCase()}
                            </div>
                            <div className="fd-user-info">
                                <span className="fd-username">@{displayUsername}</span>
                                <span className="fd-balance">${Math.floor(zimBetAccount.balance).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT */}
            <div className="fd-main">
                {view === 'games' && (
                    <>
                        <div className="fd-hero">
                            <div className="fd-hero-bg"></div>
                            <div className="fd-hero-content">
                                <span className="fd-hero-badge">🔥 HOT GAME</span>
                                <h1>AVIATOR</h1>
                                <p>Real-time multiplayer crash game. Place your bet, watch the multiplier rise, and cash out before the plane flies away!</p>
                                <button className="fd-play-btn" onClick={() => navigate('/casino/aviator')}>PLAY NOW</button>
                            </div>
                        </div>

                        <div className="fd-section">
                            <DailyBonus />
                        </div>

                        <div className="fd-section">
                            <h2>All Games</h2>
                            <div className="fd-grid">
                                {GAMES.map(game => (
                                    <div key={game.id} className="fd-game-card" onClick={() => navigate(game.link)}>
                                        <div className="fd-card-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', background: `linear-gradient(135deg, ${game.color}22, ${game.color}11)` }}>
                                            {game.image}
                                            {game.hot && <span className="fd-card-badge hot">HOT</span>}
                                            {game.new && <span className="fd-card-badge new">NEW</span>}
                                        </div>
                                        <div className="fd-card-info">
                                            <div className="fd-card-title">{game.name}</div>
                                            <div className="fd-card-desc">{game.desc}</div>
                                            <div className="fd-card-footer">
                                                <div className="fd-live-badge">
                                                    <div className="fd-live-dot"></div>
                                                    <span>Live</span>
                                                </div>
                                                <span className="fd-play-arrow">Play →</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {view === 'leaderboard' && (
                    <div className="fd-panel">
                        <div className="fd-panel-header">
                            <button className="fd-back-btn" onClick={() => setView('games')}>← Back</button>
                            <h2>🏆 Leaderboard</h2>
                        </div>
                        <Leaderboard />
                    </div>
                )}

                {view === 'wallet' && (
                    <div className="fd-panel">
                        <div className="fd-panel-header">
                            <button className="fd-back-btn" onClick={() => setView('games')}>← Back</button>
                            <h2>💳 Wallet</h2>
                        </div>
                        <Wallet />
                    </div>
                )}
            </div>
        </div>
    )
}
