import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './MobileNav.css'

export function MobileNav() {
    const navigate = useNavigate()
    const location = useLocation()
    const { zimBetAccount } = useAuth()

    if (!zimBetAccount) return null

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

    const navItems = [
        { path: '/dashboard', icon: '🎮', label: 'Games' },
        { path: '/casino/aviator', icon: '✈️', label: 'Aviator' },
        { path: '/casino/mines', icon: '💎', label: 'Mines' },
        { path: '/casino/wheel', icon: '🎡', label: 'Wheel' },
    ]

    return (
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
            <div className="mobile-nav-balance">
                <span className="balance-label">Balance</span>
                <span className="balance-amount">${Math.floor(zimBetAccount.balance).toLocaleString()}</span>
            </div>
        </nav>
    )
}
