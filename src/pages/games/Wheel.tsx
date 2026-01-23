import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase, CASINO_BETS } from '../../lib/supabase'
import { spinWheel, WHEEL_SEGMENTS, getRandomMessage, createSession, updateSession, formatMoney } from '../../lib/gameEngine'
import { soundManager } from '../../lib/audio' // Sound
import type { GameSession } from '../../lib/gameEngine'
import './Wheel.css'

export function Wheel() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const navigate = useNavigate()

    const [betAmount, setBetAmount] = useState<number>(10)
    const [isSpinning, setIsSpinning] = useState(false)
    const [result, setResult] = useState<typeof WHEEL_SEGMENTS[number] | null>(null)
    const [rotation, setRotation] = useState(0)
    const [message, setMessage] = useState('')
    const [session, setSession] = useState<GameSession>(createSession())
    const wheelRef = useRef<HTMLDivElement>(null)

    const SEGMENT_COUNT = WHEEL_SEGMENTS.length
    const SEGMENT_ANGLE = 360 / SEGMENT_COUNT

    const spin = async () => {
        if (!zimBetAccount || betAmount > zimBetAccount.balance || isSpinning) {
            setMessage('Not enough balance!')
            return
        }

        setIsSpinning(true)
        setResult(null)
        setMessage('')
        soundManager.playAction() // Sound

        // Deduct bet (whole dollars)
        const wholeBet = Math.floor(betAmount)
        await supabase
            .from('zimbet_accounts')
            .update({ balance: Math.floor(zimBetAccount.balance - wholeBet) })
            .eq('id', zimBetAccount.id)

        // Get result
        const spinResult = spinWheel()
        setResult(spinResult) // Set early so it exists for transitionEnd

        // Calculate rotation
        const segmentIndex = WHEEL_SEGMENTS.findIndex(s => s.multiplier === spinResult.multiplier)
        // Add extra spins + stop at winning segment center
        const extraSpins = 5 * 360
        // Rotation needed to bring segment to top (pointer position)
        const targetAngle = segmentIndex * SEGMENT_ANGLE
        // Add half segment to center, then offset for the segment being at top not right
        const finalRotation = rotation + extraSpins + (360 - targetAngle) - (SEGMENT_ANGLE / 2)

        setRotation(finalRotation)

        setRotation(finalRotation)
    }

    const handleSpinComplete = async () => {
        if (!isSpinning || !result) return // Should not happen in flow

        const spinResult = result
        const wholeBet = Math.floor(betAmount)
        const winnings = Math.floor(wholeBet * spinResult.multiplier)
        const isWin = spinResult.multiplier > 0

        if (isWin) {
            // Sound
            if (spinResult.multiplier >= 5) soundManager.playJackpot()
            else soundManager.playWin()

            await supabase
                .from('zimbet_accounts')
                .update({
                    balance: Math.floor(zimBetAccount!.balance - wholeBet + winnings), // Optimistic balance valid here? No, we need fresh. Safe to use cached for now if no concurrent tabs.
                    total_wins: zimBetAccount!.total_wins + 1,
                    total_earnings: Math.floor(zimBetAccount!.total_earnings + (winnings - wholeBet))
                })
                .eq('id', zimBetAccount!.id)

            setMessage(spinResult.multiplier >= 5 ? getRandomMessage('bigWin') : getRandomMessage('win'))
            setSession(prev => updateSession(prev, wholeBet, winnings, true))
        } else {
            soundManager.playLoss() // Sound
            await supabase
                .from('zimbet_accounts')
                .update({
                    total_losses: zimBetAccount!.total_losses + 1,
                    total_earnings: Math.floor(zimBetAccount!.total_earnings - wholeBet)
                })
                .eq('id', zimBetAccount!.id)

            setMessage(getRandomMessage('lose'))
            setSession(prev => updateSession(prev, wholeBet, 0, false))
        }

        setIsSpinning(false)
        refreshAccount()
    }

    return (
        <div className="wheel-page">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')} onMouseEnter={() => soundManager.playHover()}>
                    ← Back
                </button>
                <div className="game-title">
                    <span className="game-icon">🎰</span>
                    <span>Fortune Wheel</span>
                </div>
                <div className="balance">
                    {formatMoney(zimBetAccount?.balance || 0)}
                </div>
            </header>

            <div className="game-area">
                {/* Wheel Container */}
                <div className="wheel-container">
                    <div className="wheel-pointer">▼</div>
                    <div
                        ref={wheelRef}
                        className="wheel"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                            background: 'transparent',
                            boxShadow: 'none'
                        }}
                        onTransitionEnd={handleSpinComplete}
                    >
                        <svg viewBox="0 0 100 100" className="wheel-svg">
                            {WHEEL_SEGMENTS.map((segment, index) => {
                                // Calculate svg path for segment
                                const startAngle = index * SEGMENT_ANGLE
                                const endAngle = (index + 1) * SEGMENT_ANGLE

                                // Convert to radians, subtract 90deg to start from top
                                const startRad = (startAngle - 90) * Math.PI / 180
                                const endRad = (endAngle - 90) * Math.PI / 180

                                const x1 = 50 + 50 * Math.cos(startRad)
                                const y1 = 50 + 50 * Math.sin(startRad)
                                const x2 = 50 + 50 * Math.cos(endRad)
                                const y2 = 50 + 50 * Math.sin(endRad)

                                // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
                                const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0

                                const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`

                                return (
                                    <g key={index}>
                                        <path d={pathData} fill={segment.color} stroke="#1a1a2e" strokeWidth="0.5" />
                                        {/* Label Text at mid-angle */}
                                        <text
                                            x={50 + 35 * Math.cos(startRad + (endRad - startRad) / 2)}
                                            y={50 + 35 * Math.sin(startRad + (endRad - startRad) / 2)}
                                            fill="white"
                                            fontSize="5"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            transform={`rotate(${90 + (startAngle + endAngle) / 2}, ${50 + 35 * Math.cos(startRad + (endRad - startRad) / 2)}, ${50 + 35 * Math.sin(startRad + (endRad - startRad) / 2)})`}
                                        >
                                            {segment.label}
                                        </text>
                                    </g>
                                )
                            })}
                            <circle cx="50" cy="50" r="10" fill="#1a1a2e" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                            <text x="50" y="52" fill="white" fontSize="10" textAnchor="middle">🎰</text>
                        </svg>
                    </div>
                </div>

                {/* Result Display */}
                {result && !isSpinning && (
                    <div className={`result-display ${result.multiplier > 0 ? 'win' : 'lose'}`}>
                        <span className="result-mult">{result.label}</span>
                        <span className="result-amount">
                            {result.multiplier > 0
                                ? `+${formatMoney(Math.floor(betAmount * result.multiplier) - betAmount)}`
                                : formatMoney(-betAmount)
                            }
                        </span>
                    </div>
                )}

                {message && <div className="game-message">{message}</div>}
            </div>

            <div className="controls">
                {/* Bet Amount */}
                <div className="bet-section">
                    <label>Bet Amount</label>
                    <div className="quick-bets">
                        {CASINO_BETS.slice(0, 6).map(amt => (
                            <button
                                key={amt}
                                onClick={() => setBetAmount(amt)}
                                className={betAmount === amt ? 'active' : ''}
                                disabled={amt > (zimBetAccount?.balance || 0) || isSpinning}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Multiplier Legend */}
                <div className="multipliers-info">
                    {WHEEL_SEGMENTS.map((seg, i) => (
                        <div key={i} className="mult-chip" style={{ background: seg.color }}>
                            {seg.label}
                        </div>
                    ))}
                </div>

                <button
                    className="play-btn"
                    onClick={spin}
                    disabled={isSpinning || betAmount <= 0 || betAmount > (zimBetAccount?.balance || 0)}
                >
                    {isSpinning ? 'Spinning...' : `Spin for ${formatMoney(betAmount)}`}
                </button>
            </div>

            {/* Session Stats */}
            <div className="session-stats">
                <div className="stat">
                    <span className="stat-label">Spins</span>
                    <span className="stat-value">{session.gamesPlayed}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Profit</span>
                    <span className={`stat-value ${session.totalWon - session.totalWagered >= 0 ? 'positive' : 'negative'}`}>
                        {formatMoney(session.totalWon - session.totalWagered)}
                    </span>
                </div>
            </div>
        </div>
    )
}
