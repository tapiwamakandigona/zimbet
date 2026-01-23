import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './CasinoLobby.css'

const GAMES = [
    {
        id: 'aviator',
        name: 'Aviator',
        icon: '🚀',
        description: 'Cash out before the crash!',
        color: '#3498db',
        minBet: 1,
        rtp: '97%',
        popular: true
    },
    {
        id: 'coinflip',
        name: 'Coinflip',
        icon: '🪙',
        description: 'Heads or tails - 50/50 chance',
        color: '#f1c40f',
        minBet: 1,
        rtp: '97.5%',
        popular: false
    },
    {
        id: 'dice',
        name: 'Dice',
        icon: '🎲',
        description: 'Roll over or under your target',
        color: '#e74c3c',
        minBet: 1,
        rtp: '99%',
        popular: false
    },
    {
        id: 'mines',
        name: 'Mines',
        icon: '💎',
        description: 'Find gems, avoid mines!',
        color: '#27ae60',
        minBet: 1,
        rtp: '98%',
        popular: true
    },
    {
        id: 'wheel',
        name: 'Wheel',
        icon: '🎡',
        description: 'Spin to win up to 10x',
        color: '#9b59b6',
        minBet: 1,
        rtp: '95%',
        popular: false
    },
    {
        id: 'rps',
        name: 'Rock Paper Scissors',
        icon: '✊',
        description: 'Play against others or bots',
        color: '#e67e22',
        minBet: 10,
        rtp: '90%',
        popular: false
    }
]

export function CasinoLobby() {
    const { zimBetAccount } = useAuth()
    const navigate = useNavigate()

    const handleGameClick = (gameId: string) => {
        if (gameId === 'rps') {
            navigate('/dashboard')
        } else {
            navigate(`/casino/${gameId}`)
        }
    }

    return (
        <div className="casino-lobby">
            <header className="lobby-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
                    ← Back
                </button>
                <h1>🎰 Casino Games</h1>
                <div className="balance">
                    ${zimBetAccount?.balance.toFixed(2) || '0.00'}
                </div>
            </header>

            <div className="games-grid">
                {GAMES.map(game => (
                    <div
                        key={game.id}
                        className={`game-card ${game.popular ? 'popular' : ''}`}
                        onClick={() => handleGameClick(game.id)}
                        style={{ '--game-color': game.color } as React.CSSProperties}
                    >
                        {game.popular && <span className="popular-badge">🔥 HOT</span>}
                        <div className="game-icon">{game.icon}</div>
                        <h3 className="game-name">{game.name}</h3>
                        <p className="game-desc">{game.description}</p>
                        <div className="game-stats">
                            <span className="stat">Min: ${game.minBet}</span>
                            <span className="stat">RTP: {game.rtp}</span>
                        </div>
                        <button className="play-btn">Play Now</button>
                    </div>
                ))}
            </div>

            <div className="lobby-footer">
                <p>🎮 Play responsibly. This is a simulation game.</p>
            </div>
        </div>
    )
}
