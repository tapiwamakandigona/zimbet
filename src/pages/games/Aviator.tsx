import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase, CASINO_BETS } from '../../lib/supabase'
import { generateAviatorCrashPoint, getRandomMessage, createSession, updateSession } from '../../lib/gameEngine'
import type { GameSession } from '../../lib/gameEngine'
import { Confetti } from '../../components/Confetti'
import './Aviator.css'

type GamePhase = 'betting' | 'flying' | 'crashed' | 'cashout'

export function Aviator() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const navigate = useNavigate()

    // Game state
    const [phase, setPhase] = useState<GamePhase>('betting')
    const [betAmount, setBetAmount] = useState<number>(10)
    const [multiplier, setMultiplier] = useState<number>(1.00)
    const [crashPoint, setCrashPoint] = useState<number>(0)
    const [cashoutMultiplier, setCashoutMultiplier] = useState<number>(0)
    const [autoCashout, setAutoCashout] = useState<number>(0)
    const [message, setMessage] = useState<string>('')
    const [history, setHistory] = useState<number[]>([])
    const [session, setSession] = useState<GameSession>(createSession())
    const [showConfetti, setShowConfetti] = useState(false)

    // Animation refs
    const animationRef = useRef<number | undefined>(undefined)
    const startTimeRef = useRef<number>(0)

    // Load history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('aviator_history')
        if (saved) {
            setHistory(JSON.parse(saved))
        }
    }, [])

    // Save history to localStorage
    const saveHistory = (crash: number) => {
        const newHistory = [crash, ...history].slice(0, 20)
        setHistory(newHistory)
        localStorage.setItem('aviator_history', JSON.stringify(newHistory))
    }

    const startGame = async () => {
        if (!zimBetAccount || betAmount > zimBetAccount.balance) {
            setMessage('Insufficient balance!')
            return
        }

        // Deduct bet
        const { error } = await supabase
            .from('zimbet_accounts')
            .update({ balance: zimBetAccount.balance - betAmount })
            .eq('id', zimBetAccount.id)

        if (error) {
            setMessage('Failed to place bet')
            return
        }

        // Generate crash point
        const crash = generateAviatorCrashPoint()
        setCrashPoint(crash)
        setCashoutMultiplier(0)
        setMultiplier(1.00)
        setMessage('')
        setPhase('flying')

        // Start animation
        startTimeRef.current = Date.now()
        animationRef.current = requestAnimationFrame(updateMultiplier)
    }

    const updateMultiplier = () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        // Exponential growth: grows faster over time
        const newMultiplier = Math.pow(Math.E, elapsed * 0.1)
        const rounded = Math.round(newMultiplier * 100) / 100

        setMultiplier(rounded)

        // Check auto cashout
        if (autoCashout > 0 && rounded >= autoCashout) {
            cashout(rounded)
            return
        }

        // Check crash
        if (rounded >= crashPoint) {
            crash()
            return
        }

        animationRef.current = requestAnimationFrame(updateMultiplier)
    }

    const cashout = async (mult?: number) => {
        if (phase !== 'flying') return

        cancelAnimationFrame(animationRef.current!)
        const cashMult = mult || multiplier
        setCashoutMultiplier(cashMult)

        const winnings = betAmount * cashMult
        const profit = winnings - betAmount

        // Update balance
        if (zimBetAccount) {
            await supabase
                .from('zimbet_accounts')
                .update({
                    balance: zimBetAccount.balance - betAmount + winnings,
                    total_wins: zimBetAccount.total_wins + 1,
                    total_earnings: zimBetAccount.total_earnings + profit
                })
                .eq('id', zimBetAccount.id)
        }

        setMessage(cashMult >= 3 ? getRandomMessage('bigWin') : getRandomMessage('win'))
        setSession(updateSession(session, betAmount, winnings, true))
        setPhase('cashout')

        // Trigger confetti on big wins
        if (cashMult >= 3) {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 3500)
        }

        refreshAccount()

        // Auto-continue to show crash after cashout
        setTimeout(() => {
            crashAfterCashout()
        }, 500)
    }

    const crashAfterCashout = () => {
        // Continue animation to show where it would have crashed
        startTimeRef.current = Date.now() - (Math.log(cashoutMultiplier) / 0.1 * 1000)

        const continueCrash = () => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000
            const newMultiplier = Math.pow(Math.E, elapsed * 0.1)
            const rounded = Math.round(newMultiplier * 100) / 100

            setMultiplier(rounded)

            if (rounded >= crashPoint) {
                saveHistory(crashPoint)
                return
            }

            requestAnimationFrame(continueCrash)
        }

        continueCrash()
    }

    const crash = async () => {
        cancelAnimationFrame(animationRef.current!)
        setMultiplier(crashPoint)
        saveHistory(crashPoint)

        // Update stats
        if (zimBetAccount) {
            await supabase
                .from('zimbet_accounts')
                .update({
                    total_losses: zimBetAccount.total_losses + 1,
                    total_earnings: zimBetAccount.total_earnings - betAmount
                })
                .eq('id', zimBetAccount.id)
        }

        setMessage(getRandomMessage('lose'))
        setSession(updateSession(session, betAmount, 0, false))
        setPhase('crashed')
        refreshAccount()
    }

    const playAgain = () => {
        setPhase('betting')
        setMultiplier(1.00)
        setCashoutMultiplier(0)
        setMessage('')
    }

    const getMultiplierColor = () => {
        if (multiplier < 1.5) return '#3498db'
        if (multiplier < 2) return '#2ecc71'
        if (multiplier < 3) return '#f1c40f'
        if (multiplier < 5) return '#e67e22'
        return '#e74c3c'
    }

    return (
        <div className="aviator-page">
            <Confetti trigger={showConfetti} />
            {/* Header */}
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
                    ← Back
                </button>
                <div className="game-title">
                    <span className="game-icon">🚀</span>
                    <span>Aviator</span>
                </div>
                <div className="balance">
                    ${zimBetAccount?.balance.toFixed(2) || '0.00'}
                </div>
            </header>

            {/* History Bar */}
            <div className="history-bar">
                {history.map((crash, i) => (
                    <span
                        key={i}
                        className={`history-item ${crash < 2 ? 'low' : crash > 5 ? 'high' : 'mid'}`}
                    >
                        {crash.toFixed(2)}x
                    </span>
                ))}
            </div>

            {/* Main Game Area */}
            <div className="game-area">
                <div className="flight-zone">
                    {/* Rocket Animation */}
                    <div
                        className={`rocket ${phase === 'flying' ? 'flying' : ''} ${phase === 'crashed' ? 'crashed' : ''}`}
                        style={{
                            '--progress': phase === 'flying' ? Math.min((multiplier - 1) / 10, 1) : 0
                        } as React.CSSProperties}
                    >
                        {phase === 'crashed' ? '💥' : '🚀'}
                    </div>

                    {/* Multiplier Display */}
                    <div
                        className={`multiplier-display ${phase === 'crashed' ? 'crashed' : ''}`}
                        style={{ color: getMultiplierColor() }}
                    >
                        {multiplier.toFixed(2)}x
                    </div>

                    {/* Cashout Success */}
                    {phase === 'cashout' && (
                        <div className="cashout-success">
                            <span className="cashout-label">Cashed out at</span>
                            <span className="cashout-value">{cashoutMultiplier.toFixed(2)}x</span>
                            <span className="cashout-winnings">
                                +${(betAmount * cashoutMultiplier - betAmount).toFixed(2)}
                            </span>
                        </div>
                    )}

                    {/* Message */}
                    {message && (
                        <div className="game-message">{message}</div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="controls">
                {phase === 'betting' && (
                    <>
                        <div className="bet-section">
                            <label>Bet Amount</label>
                            <div className="bet-input">
                                <button onClick={() => setBetAmount(Math.max(1, betAmount / 2))}>½</button>
                                <input
                                    type="number"
                                    value={betAmount}
                                    onChange={(e) => setBetAmount(Number(e.target.value))}
                                    min={1}
                                    max={zimBetAccount?.balance || 0}
                                />
                                <button onClick={() => setBetAmount(Math.min(betAmount * 2, zimBetAccount?.balance || 0))}>2x</button>
                            </div>
                            <div className="quick-bets">
                                {CASINO_BETS.slice(0, 5).map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setBetAmount(amt)}
                                        className={betAmount === amt ? 'active' : ''}
                                        disabled={amt > (zimBetAccount?.balance || 0)}
                                    >
                                        ${amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="auto-section">
                            <label>Auto Cashout</label>
                            <div className="auto-input">
                                <input
                                    type="number"
                                    value={autoCashout || ''}
                                    onChange={(e) => setAutoCashout(Number(e.target.value))}
                                    placeholder="Off"
                                    step="0.1"
                                    min="1.1"
                                />
                                <span>x</span>
                            </div>
                        </div>

                        <button
                            className="play-btn"
                            onClick={startGame}
                            disabled={betAmount <= 0 || betAmount > (zimBetAccount?.balance || 0)}
                        >
                            Start Flight 🚀
                        </button>
                    </>
                )}

                {phase === 'flying' && (
                    <button
                        className="cashout-btn pulse"
                        onClick={() => cashout()}
                    >
                        CASH OUT<br />
                        <span className="cashout-amount">${(betAmount * multiplier).toFixed(2)}</span>
                    </button>
                )}

                {(phase === 'crashed' || phase === 'cashout') && (
                    <button className="play-btn" onClick={playAgain}>
                        Play Again
                    </button>
                )}
            </div>

            {/* Session Stats */}
            <div className="session-stats">
                <div className="stat">
                    <span className="stat-label">Games</span>
                    <span className="stat-value">{session.gamesPlayed}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Wagered</span>
                    <span className="stat-value">${session.totalWagered.toFixed(2)}</span>
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
