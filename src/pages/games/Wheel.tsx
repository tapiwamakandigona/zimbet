import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase, CASINO_BETS } from '../../lib/supabase'
import { spinWheel, WHEEL_SEGMENTS, getRandomMessage, createSession, updateSession } from '../../lib/gameEngine'
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

    const spin = async () => {
        if (!zimBetAccount || betAmount > zimBetAccount.balance || isSpinning) {
            setMessage('Insufficient balance!')
            return
        }

        setIsSpinning(true)
        setResult(null)
        setMessage('')

        // Deduct bet
        await supabase
            .from('zimbet_accounts')
            .update({ balance: zimBetAccount.balance - betAmount })
            .eq('id', zimBetAccount.id)

        // Get result
        const spinResult = spinWheel()

        // Calculate rotation
        // Each segment is 45 degrees (360 / 8 segments)
        const segmentIndex = WHEEL_SEGMENTS.findIndex(s => s.multiplier === spinResult.multiplier)
        const segmentAngle = segmentIndex * (360 / WHEEL_SEGMENTS.length)
        // Add extra spins for dramatic effect + position to stop at segment
        const extraSpins = 5 * 360 // 5 full rotations
        const finalRotation = rotation + extraSpins + (360 - segmentAngle) + 22.5 // +22.5 to center on segment

        setRotation(finalRotation)

        // Wait for spin animation
        setTimeout(async () => {
            setResult(spinResult)

            const winnings = betAmount * spinResult.multiplier
            const isWin = spinResult.multiplier > 0

            if (isWin) {
                await supabase
                    .from('zimbet_accounts')
                    .update({
                        balance: zimBetAccount.balance - betAmount + winnings,
                        total_wins: zimBetAccount.total_wins + 1,
                        total_earnings: zimBetAccount.total_earnings + (winnings - betAmount)
                    })
                    .eq('id', zimBetAccount.id)

                setMessage(spinResult.multiplier >= 5 ? getRandomMessage('bigWin') : getRandomMessage('win'))
                setSession(updateSession(session, betAmount, winnings, true))
            } else {
                await supabase
                    .from('zimbet_accounts')
                    .update({
                        total_losses: zimBetAccount.total_losses + 1,
                        total_earnings: zimBetAccount.total_earnings - betAmount
                    })
                    .eq('id', zimBetAccount.id)

                setMessage(getRandomMessage('lose'))
                setSession(updateSession(session, betAmount, 0, false))
            }

            setIsSpinning(false)
            refreshAccount()
        }, 4000) // Match CSS animation duration
    }

    return (
        <div className="wheel-page">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
                    ← Back
                </button>
                <div className="game-title">
                    <span className="game-icon">🎡</span>
                    <span>Wheel</span>
                </div>
                <div className="balance">
                    ${zimBetAccount?.balance.toFixed(2) || '0.00'}
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
                                    transform: `rotate(${index * (360 / WHEEL_SEGMENTS.length)}deg)`,
                                    background: segment.color
                                }}
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
                                ? `+$${(betAmount * result.multiplier - betAmount).toFixed(2)}`
                                : `-$${betAmount.toFixed(2)}`
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

                {/* Multiplier Info */}
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
                    {isSpinning ? 'Spinning...' : `Spin for $${betAmount}`}
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
                        ${(session.totalWon - session.totalWagered).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    )
}
