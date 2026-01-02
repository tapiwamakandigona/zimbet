import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Wallet } from '../components/Wallet'
import { Leaderboard } from '../components/Leaderboard'
import './FeatureDashboard.css'

import { soundManager } from '../lib/audio'

export function FeatureDashboard() {
    const { zimBetAccount, signOut } = useAuth()
    const navigate = useNavigate()
    const [view, setView] = useState<'games' | 'wallet' | 'leaderboard'>('games')
    const [muted, setMuted] = useState(soundManager.isMuted())

    const toggleMute = () => {
        setMuted(soundManager.toggleMute())
    }

    const GAMES = [
        { id: 'aviator', name: 'Aviator', desc: 'Predict the crash point', image: '✈️', color: '#e23333', link: '/casino/aviator' },
        { id: 'mines', name: 'Mines', desc: 'Avoid the bombs', image: '💣', color: '#f59e0b', link: '/casino/mines' },
        { id: 'dice', name: 'Dice', desc: 'Roll high or low', image: '🎲', color: '#3b82f6', link: '/casino/dice' },
        { id: 'coinflip', name: 'Coin Flip', desc: 'Heads or Tails?', image: '🪙', color: '#10b981', link: '/casino/coinflip' },
        { id: 'wheel', name: 'Wheel', desc: 'Spin to win big', image: '🎡', color: '#8b5cf6', link: '/casino/wheel' },
        { id: 'plinko', name: 'Plinko', desc: 'Drop the ball to win', image: '🎯', color: '#ec4899', link: '/casino/plinko' },
    ]

    return (
        <div className="feature-dashboard">
            {/* MOBILE HEADER */}
            <div className="fd-mobile-header">
                <div className="fd-brand">
                    <span>ZimBet</span>
                </div>
                <div className="fd-avatar" onClick={() => setView('wallet')}>
                    {zimBetAccount?.username.charAt(0).toUpperCase()}
                </div>
            </div>

            {/* SIDEBAR */}
            <div className="fd-sidebar">
                <div className="fd-brand">
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
                        <span>{muted ? '🔇' : '🔊'}</span> {muted ? 'Unmute Sounds' : 'Mute Sounds'}
                    </button>
                    <button className="fd-nav-item" onClick={signOut}>
                        <span>🚪</span> Sign Out
                    </button>
                </nav>

                {zimBetAccount && (
                    <div className="fd-user-section">
                        <div className="fd-user-card">
                            <div className="fd-avatar">
                                {zimBetAccount.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="fd-user-info">
                                <span className="fd-username">@{zimBetAccount.username}</span>
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
                                <span className="fd-hero-badge">HOT GAME</span>
                                <h1>AVIATOR</h1>
                                <p>The world's most popular crash game. Place your bet, watch the multiplier rise, and cash out before the plane flies away!</p>
                                <button className="fd-play-btn" onClick={() => navigate('/casino/aviator')}>PLAY NOW</button>
                            </div>
                        </div>

                        <div className="fd-section">
                            <h2>Popular Games</h2>
                            <div className="fd-grid">
                                {GAMES.map(game => (
                                    <div key={game.id} className="fd-game-card" onClick={() => navigate(game.link)}>
                                        <div className="fd-card-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', background: `linear-gradient(135deg, ${game.color}22, ${game.color}11)` }}>
                                            {game.image}
                                        </div>
                                        <div className="fd-card-info">
                                            <div className="fd-card-title">{game.name}</div>
                                            <div className="fd-card-desc">{game.desc}</div>
                                            <div className="fd-card-footer">
                                                <div className="fd-live-badge">
                                                    <div className="fd-live-dot"></div>
                                                    <span>Live</span>
                                                </div>
                                                <span>Play →</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {view === 'leaderboard' && (
                    <div style={{ padding: '40px' }}>
                        <Leaderboard />
                    </div>
                )}

                {view === 'wallet' && (
                    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
                        <Wallet />
                    </div>
                )}
            </div>
        </div>
    )
}
