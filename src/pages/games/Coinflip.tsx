import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase, CASINO_BETS } from '../../lib/supabase'
import { flipCoin, getRandomMessage, createSession, updateSession, formatMoney } from '../../lib/gameEngine'
import { soundManager } from '../../lib/audio' // Sound
import type { GameSession } from '../../lib/gameEngine'
import './Coinflip.css'

export function Coinflip() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const navigate = useNavigate()

    const [betAmount, setBetAmount] = useState<number>(10)
    const [choice, setChoice] = useState<'heads' | 'tails'>('heads')
    const [result, setResult] = useState<'heads' | 'tails' | null>(null)
    const [isFlipping, setIsFlipping] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [isWin, setIsWin] = useState<boolean | null>(null)
    const [message, setMessage] = useState('')
    const [session, setSession] = useState<GameSession>(createSession())
    const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('coinflip_streak') || '0'))

    const MULTIPLIER = 1.95 // 2.5% house edge

    const play = async () => {
        if (!zimBetAccount || betAmount > zimBetAccount.balance) {
            setMessage('Insufficient balance!')
            return
        }

        setIsFlipping(true)
        setResult(null)
        setIsWin(null)
        setMessage('')
        soundManager.playAction()

        // Deduct bet
        await supabase
            .from('zimbet_accounts')
            .update({ balance: zimBetAccount.balance - betAmount })
            .eq('id', zimBetAccount.id)

        // Determine result immediately
        const flipResult = flipCoin()

        // Calculate target rotation
        // Standard spin = 1800deg (5 spins)
        // If tails, add 180deg
        const extraSpins = 1800
        const resultOffset = flipResult === 'tails' ? 180 : 0

        // Ensure we always spin forward from current position relative to modulo 360
        // But simply adding large constant works for visual effect
        const targetRotation = rotation + extraSpins + resultOffset

        // Adjust if we are currently at an offset
        // If current is tails (180 mod 360), and we want heads (0 mod 360), we add 180.
        // Actually simplest is just always add 1800 + whatever makes it match result
        // Current rotation % 360 tells us where we are.
        // Heads = 0, Tails = 180.

        setRotation(targetRotation)

        // Flip after animation delay
        setTimeout(async () => {
            setResult(flipResult)

            const won = flipResult === choice
            setIsWin(won)

            if (won) {
                soundManager.playWin()
                const winnings = Math.ceil(betAmount * MULTIPLIER)
                const newStreak = streak + 1
                setStreak(newStreak)
                localStorage.setItem('coinflip_streak', String(newStreak))

                await supabase
                    .from('zimbet_accounts')
                    .update({
                        balance: zimBetAccount.balance - betAmount + winnings,
                        total_wins: zimBetAccount.total_wins + 1,
                        total_earnings: zimBetAccount.total_earnings + (winnings - betAmount)
                    })
                    .eq('id', zimBetAccount.id)

                setMessage(newStreak >= 3 ? `🔥 ${newStreak} STREAK! ${getRandomMessage('bigWin')}` : getRandomMessage('win'))
                setSession(updateSession(session, betAmount, winnings, true))
            } else {
                soundManager.playLoss()
                setStreak(0)
                localStorage.setItem('coinflip_streak', '0')

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

            setIsFlipping(false)
            refreshAccount()
        }, 2000) // Animation duration matches transition
    }

    return (
        <div className="coinflip-page">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')} onMouseEnter={() => soundManager.playHover()}>
                    ← Back
                </button>
                <div className="game-title">
                    <span className="game-icon">🪙</span>
                    <span>Coinflip</span>
                </div>
                <div className="balance">
                    {formatMoney(zimBetAccount?.balance || 0)}
                </div>
            </header>

            <div className="game-area">
                {/* Coin */}
                <div className="coin-container">
                    <div
                        className="coin"
                        style={{
                            transform: `rotateY(${rotation}deg)`,
                            transition: isFlipping ? 'transform 2s cubic-bezier(0.4, 2, 0.55, 0.44)' : 'transform 0.5s'
                        }}
                    >
                        <div className="coin-face heads">
                            <span>🦅</span>
                            <span className="label">HEADS</span>
                        </div>
                        <div className="coin-face tails">
                            <span>🌟</span>
                            <span className="label">TAILS</span>
                        </div>
                    </div>
                </div>

                {/* Result Display */}
                {result && !isFlipping && (
                    <div className={`result-display ${isWin ? 'win' : 'lose'}`}>
                        <span className="result-icon">{isWin ? '🎉' : '😢'}</span>
                        <span className="result-text">
                            {isWin ? `+$${(betAmount * MULTIPLIER - betAmount).toFixed(2)}` : `-$${betAmount.toFixed(2)}`}
                        </span>
                    </div>
                )}

                {/* Message */}
                {message && (
                    <div className="game-message">{message}</div>
                )}

                {/* Streak Badge */}
                {streak >= 2 && (
                    <div className="streak-badge">
                        🔥 {streak} Win Streak!
                    </div>
                )}
            </div>

            <div className="controls">
                {/* Choice Selection */}
                <div className="choice-section">
                    <label>Pick Your Side</label>
                    <div className="choice-buttons">
                        <button
                            className={`choice-btn ${choice === 'heads' ? 'active' : ''}`}
                            onClick={() => setChoice('heads')}
                            disabled={isFlipping}
                        >
                            <span>🦅</span>
                            <span>Heads</span>
                        </button>
                        <button
                            className={`choice-btn ${choice === 'tails' ? 'active' : ''}`}
                            onClick={() => setChoice('tails')}
                            disabled={isFlipping}
                        >
                            <span>🌟</span>
                            <span>Tails</span>
                        </button>
                    </div>
                </div>

                {/* Bet Amount */}
                <div className="bet-section">
                    <label>Bet Amount</label>
                    <div className="quick-bets">
                        {CASINO_BETS.slice(0, 6).map(amt => (
                            <button
                                key={amt}
                                onClick={() => setBetAmount(amt)}
                                className={betAmount === amt ? 'active' : ''}
                                disabled={amt > (zimBetAccount?.balance || 0) || isFlipping}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payout Info */}
                <div className="payout-info">
                    <span>Win {MULTIPLIER}x</span>
                    <span className="potential-win">
                        Potential: ${(betAmount * MULTIPLIER).toFixed(2)}
                    </span>
                </div>

                {/* Play Button */}
                <button
                    className="play-btn"
                    onClick={play}
                    disabled={isFlipping || betAmount <= 0 || betAmount > (zimBetAccount?.balance || 0)}
                >
                    {isFlipping ? 'Flipping...' : `Flip for $${betAmount}`}
                </button>
            </div>

            {/* Session Stats */}
            <div className="session-stats">
                <div className="stat">
                    <span className="stat-label">Games</span>
                    <span className="stat-value">{session.gamesPlayed}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Profit</span>
                    <span className={`stat-value ${session.totalWon - session.totalWagered >= 0 ? 'positive' : 'negative'}`}>
                        ${(session.totalWon - session.totalWagered).toFixed(2)}
                    </span>
                </div>
                <div className="stat">
                    <span className="stat-label">Best Streak</span>
                    <span className="stat-value">{session.maxStreak}</span>
                </div>
            </div>
        </div>
    )
}
