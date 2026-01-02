import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase, CASINO_BETS } from '../../lib/supabase'
import { spinWheel, WHEEL_SEGMENTS, getRandomMessage, createSession, updateSession, formatMoney } from '../../lib/gameEngine'
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

        // Deduct bet (whole dollars)
        const wholeBet = Math.floor(betAmount)
        await supabase
            .from('zimbet_accounts')
            .update({ balance: Math.floor(zimBetAccount.balance - wholeBet) })
            .eq('id', zimBetAccount.id)

        // Get result
        const spinResult = spinWheel()

        // Calculate rotation
        const segmentIndex = WHEEL_SEGMENTS.findIndex(s => s.multiplier === spinResult.multiplier)
        // Add extra spins + stop at winning segment center
        const extraSpins = 5 * 360
        // Rotation needed to bring segment to top (pointer position)
        const targetAngle = segmentIndex * SEGMENT_ANGLE
        // Add half segment to center, then offset for the segment being at top not right
        const finalRotation = rotation + extraSpins + (360 - targetAngle) - (SEGMENT_ANGLE / 2)

        setRotation(finalRotation)

        // Wait for spin animation
        setTimeout(async () => {
            setResult(spinResult)

            const winnings = Math.floor(wholeBet * spinResult.multiplier)
            const isWin = spinResult.multiplier > 0

            if (isWin) {
                await supabase
                    .from('zimbet_accounts')
                    .update({
                        balance: Math.floor(zimBetAccount.balance - wholeBet + winnings),
                        total_wins: zimBetAccount.total_wins + 1,
                        total_earnings: Math.floor(zimBetAccount.total_earnings + (winnings - wholeBet))
                    })
                    .eq('id', zimBetAccount.id)

                setMessage(spinResult.multiplier >= 5 ? getRandomMessage('bigWin') : getRandomMessage('win'))
                setSession(updateSession(session, wholeBet, winnings, true))
            } else {
                await supabase
                    .from('zimbet_accounts')
                    .update({
                        total_losses: zimBetAccount.total_losses + 1,
                        total_earnings: Math.floor(zimBetAccount.total_earnings - wholeBet)
                    })
                    .eq('id', zimBetAccount.id)

                setMessage(getRandomMessage('lose'))
                setSession(updateSession(session, wholeBet, 0, false))
            }

            setIsSpinning(false)
            refreshAccount()
        }, 4000)
    }

    return (
        <div className="wheel-page">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
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
                            transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
                        }}
                    >
                        {WHEEL_SEGMENTS.map((segment, index) => (
                            <div
                                key={index}
                                className="wheel-segment"
                                style={{
                                    '--segment-angle': `${SEGMENT_ANGLE}deg`,
                                    '--segment-rotation': `${index * SEGMENT_ANGLE}deg`,
                                    background: segment.color
                                } as React.CSSProperties}
                            >
                                <span className="segment-label">{segment.label}</span>
                            </div>
                        ))}
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
