import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './MobileNav.css'

export function MobileNav() {
    const navigate = useNavigate()
    const location = useLocation()
    const { zimBetAccount, signOut } = useAuth()
    const [showMenu, setShowMenu] = useState(false)

    if (!zimBetAccount) return null

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

    const handleSignOut = async () => {
        await signOut()
        navigate('/', { replace: true })
    }

    const navItems = [
        { path: '/dashboard', icon: '🎮', label: 'Games' },
        { path: '/casino/aviator', icon: '✈️', label: 'Aviator' },
        { path: '/casino/mines', icon: '💎', label: 'Mines' },
    ]

    return (
        <>
            {/* Quick Menu Overlay */}
            {showMenu && (
                <div className="mobile-menu-overlay" onClick={() => setShowMenu(false)}>
                    <div className="mobile-menu" onClick={e => e.stopPropagation()}>
                        <div className="mobile-menu-header">
                            <div className="mobile-menu-user">
                                <div className="mobile-menu-avatar">
                                    {zimBetAccount.username.replace(/^zm-/i, '').charAt(0).toUpperCase()}
                                </div>
                                <div className="mobile-menu-info">
                                    <span className="mobile-menu-name">@{zimBetAccount.username.replace(/^zm-/i, '')}</span>
                                    <span className="mobile-menu-balance">${Math.floor(zimBetAccount.balance).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mobile-menu-items">
                            <button onClick={() => { navigate('/dashboard'); setShowMenu(false) }}>
                                <span>🎮</span> All Games
                            </button>
                            <button onClick={() => { navigate('/casino/wheel'); setShowMenu(false) }}>
                                <span>🎡</span> Wheel
                            </button>
                            <button onClick={() => { navigate('/casino/plinko'); setShowMenu(false) }}>
                                <span>🎯</span> Plinko
                            </button>
                            <button onClick={() => { navigate('/casino/dice'); setShowMenu(false) }}>
                                <span>🎲</span> Dice
                            </button>
                            <button onClick={() => { navigate('/casino/coinflip'); setShowMenu(false) }}>
                                <span>🪙</span> Coinflip
                            </button>
                            <div className="mobile-menu-divider"></div>
                            <button className="mobile-menu-logout" onClick={handleSignOut}>
                                <span>🚪</span> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Nav */}
            <nav className="mobile-nav">
                {navItems.map(item => (
                    <button
                        key={item.path}
                        className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <span className="mobile-nav-icon">{item.icon}</span>
                        <span className="mobile-nav-label">{item.label}</span>
                    </button>
                ))}
                <button
                    className="mobile-nav-item mobile-nav-menu"
                    onClick={() => setShowMenu(true)}
                >
                    <span className="mobile-nav-icon">☰</span>
                    <span className="mobile-nav-label">More</span>
                </button>
            </nav>
        </>
    )
}
