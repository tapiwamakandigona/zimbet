import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase, CASINO_BETS } from '../../lib/supabase'
import { rollDice, calculateDiceMultiplier, getRandomMessage, isNearMiss, createSession, updateSession, formatMoney } from '../../lib/gameEngine'
import { soundManager } from '../../lib/audio' // Sound
import type { GameSession } from '../../lib/gameEngine'
import './Dice.css'

type Mode = 'over' | 'under'

export function Dice() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const navigate = useNavigate()

    const [betAmount, setBetAmount] = useState<number>(10)
    const [target, setTarget] = useState<number>(50)
    const [mode, setMode] = useState<Mode>('over')
    const [diceResult, setDiceResult] = useState<number | null>(null)
    const [isRolling, setIsRolling] = useState(false)
    const [isWin, setIsWin] = useState<boolean | null>(null)
    const [message, setMessage] = useState('')
    const [session, setSession] = useState<GameSession>(createSession())

    const winChance = mode === 'over' ? 100 - target : target
    const multiplier = calculateDiceMultiplier(winChance)

    const play = async () => {
        if (!zimBetAccount || betAmount > zimBetAccount.balance || winChance < 1 || winChance > 98) {
            setMessage(winChance < 1 || winChance > 98 ? 'Invalid win chance!' : 'Insufficient balance!')
            return
        }

        setIsRolling(true)
        setDiceResult(null)
        setIsWin(null)
        setMessage('')
        soundManager.playAction()

        // Deduct bet
        await supabase
            .from('zimbet_accounts')
            .update({ balance: zimBetAccount.balance - betAmount })
            .eq('id', zimBetAccount.id)

        // Roll after animation
        setTimeout(async () => {
            const result = rollDice()
            setDiceResult(result)

            const won = mode === 'over' ? result > target : result < target
            setIsWin(won)

            if (won) {
                soundManager.playWin()
                const winnings = betAmount * multiplier

                await supabase
                    .from('zimbet_accounts')
                    .update({
                        balance: zimBetAccount.balance - betAmount + winnings,
                        total_wins: zimBetAccount.total_wins + 1,
                        total_earnings: zimBetAccount.total_earnings + (winnings - betAmount)
                    })
                    .eq('id', zimBetAccount.id)

                setMessage(multiplier >= 5 ? getRandomMessage('bigWin') : getRandomMessage('win'))
                setSession(updateSession(session, betAmount, winnings, true))
            } else {
                soundManager.playLoss()
                await supabase
                    .from('zimbet_accounts')
                    .update({
                        total_losses: zimBetAccount.total_losses + 1,
                        total_earnings: zimBetAccount.total_earnings - betAmount
                    })
                    .eq('id', zimBetAccount.id)

                // Near miss detection
                const nearMiss = isNearMiss(result, target, 0.05)
                setMessage(nearMiss ? getRandomMessage('nearMiss') : getRandomMessage('lose'))
                setSession(updateSession(session, betAmount, 0, false))
            }

            setIsRolling(false)
            refreshAccount()
        }, 1200)
    }

    const getResultColor = () => {
        if (diceResult === null) return 'inherit'
        if (isWin) return '#2ecc71'
        return '#e74c3c'
    }

    return (
        <div className="dice-page">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')} onMouseEnter={() => soundManager.playHover()}>
                    ← Back
                </button>
                <div className="game-title">
                    <span className="game-icon">🎲</span>
                    <span>Dice</span>
                </div>
                <div className="balance">
                    {formatMoney(zimBetAccount?.balance || 0)}
                </div>
            </header>

            <div className="game-area">
                {/* Dice Display */}
                <div className={`dice-display ${isRolling ? 'rolling' : ''}`}>
                    <div className="dice-number" style={{ color: getResultColor() }}>
                        {isRolling ? '?' : (diceResult ?? '--')}
                    </div>
                </div>

                {/* Result */}
                {diceResult !== null && !isRolling && (
                    <div className={`result-badge ${isWin ? 'win' : 'lose'}`}>
                        {isWin ? (
                            <>+${(betAmount * multiplier - betAmount).toFixed(2)}</>
                        ) : (
                            <>-${betAmount.toFixed(2)}</>
                        )}
                    </div>
                )}

                {/* Target Condition */}
                <div className="target-display">
                    Roll {mode === 'over' ? '>' : '<'} {target}
                </div>

                {message && <div className="game-message">{message}</div>}
            </div>

            <div className="controls">
                {/* Mode Toggle */}
                <div className="mode-section">
                    <button
                        className={`mode-btn ${mode === 'under' ? 'active' : ''}`}
                        onClick={() => setMode('under')}
                        disabled={isRolling}
                    >
                        Roll Under ⬇️
                    </button>
                    <button
                        className={`mode-btn ${mode === 'over' ? 'active' : ''}`}
                        onClick={() => setMode('over')}
                        disabled={isRolling}
                    >
                        Roll Over ⬆️
                    </button>
                </div>

                {/* Target Slider */}
                <div className="slider-section">
                    <label>Target: {target}</label>
                    <input
                        type="range"
                        min="2"
                        max="98"
                        value={target}
                        onChange={(e) => setTarget(Number(e.target.value))}
                        disabled={isRolling}
                        className="target-slider"
                    />
                    <div className="slider-labels">
                        <span>2</span>
                        <span>50</span>
                        <span>98</span>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="stats-row">
                    <div className="stat-box">
                        <span className="stat-label">Win Chance</span>
                        <span className="stat-value">{winChance.toFixed(1)}%</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Multiplier</span>
                        <span className="stat-value green">{multiplier.toFixed(2)}x</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Profit</span>
                        <span className="stat-value green">${(betAmount * multiplier - betAmount).toFixed(2)}</span>
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
                                disabled={amt > (zimBetAccount?.balance || 0) || isRolling}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    className="play-btn"
                    onClick={play}
                    disabled={isRolling || betAmount <= 0 || betAmount > (zimBetAccount?.balance || 0)}
                >
                    {isRolling ? 'Rolling...' : `Roll for $${betAmount}`}
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
            </div>
        </div>
    )
}
