import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { generateAviatorCrashPoint, getRandomMessage, formatMoney } from '../../lib/gameEngine'
import { Confetti } from '../../components/Confetti'
import './Aviator.css'

type GamePhase = 'waiting' | 'betting' | 'flying' | 'crashed'

const BET_AMOUNTS = [1, 5, 10, 25, 50, 100, 250, 500]

export function Aviator() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const navigate = useNavigate()

    // Game state - continuous rounds
    const [phase, setPhase] = useState<GamePhase>('waiting')
    const [multiplier, setMultiplier] = useState<number>(1.00)
    const [crashPoint, setCrashPoint] = useState<number>(0)
    const [countdown, setCountdown] = useState<number>(0)
    const [history, setHistory] = useState<number[]>([])

    // Player bet state
    const [betAmount, setBetAmount] = useState<number>(10)
    const [hasBet, setHasBet] = useState(false)
    const [hasCashedOut, setHasCashedOut] = useState(false)
    const [cashoutMultiplier, setCashoutMultiplier] = useState(0)
    const [winnings, setWinnings] = useState(0)
    const [message, setMessage] = useState('')
    const [showConfetti, setShowConfetti] = useState(false)

    // Refs for animation
    const animationRef = useRef<number | undefined>(undefined)
    const startTimeRef = useRef<number>(0)
    const phaseRef = useRef<GamePhase>('waiting')

    // Keep phase ref in sync
    useEffect(() => {
        phaseRef.current = phase
    }, [phase])

    // Load history
    useEffect(() => {
        const saved = localStorage.getItem('aviator_history')
        if (saved) setHistory(JSON.parse(saved))
    }, [])

    const saveHistory = useCallback((crash: number) => {
        setHistory(prev => {
            const newHistory = [crash, ...prev].slice(0, 15)
            localStorage.setItem('aviator_history', JSON.stringify(newHistory))
            return newHistory
        })
    }, [])

    // Start a new round
    const startRound = useCallback(() => {
        // Betting phase - 5 seconds
        setPhase('betting')
        setMultiplier(1.00)
        setHasCashedOut(false)
        setCashoutMultiplier(0)
        setWinnings(0)
        setMessage('')

        let count = 5
        setCountdown(count)

        const countdownInterval = setInterval(() => {
            count--
            setCountdown(count)
            if (count <= 0) {
                clearInterval(countdownInterval)
                startFlight()
            }
        }, 1000)
    }, [])

    // Start the flight
    const startFlight = useCallback(() => {
        const crash = generateAviatorCrashPoint()
        setCrashPoint(crash)
        setPhase('flying')

        startTimeRef.current = Date.now()

        const updateMultiplier = () => {
            if (phaseRef.current !== 'flying') return

            const elapsed = (Date.now() - startTimeRef.current) / 1000
            const newMultiplier = Math.pow(Math.E, elapsed * 0.08)
            const rounded = Math.round(newMultiplier * 100) / 100

            setMultiplier(rounded)

            if (rounded >= crash) {
                // Crash!
                handleCrash(crash)
                return
            }

            animationRef.current = requestAnimationFrame(updateMultiplier)
        }

        animationRef.current = requestAnimationFrame(updateMultiplier)
    }, [])

    // Handle crash
    const handleCrash = useCallback((crash: number) => {
        cancelAnimationFrame(animationRef.current!)
        setMultiplier(crash)
        setPhase('crashed')
        saveHistory(crash)

        // If player had bet and didn't cash out, they lose
        if (hasBet && !hasCashedOut) {
            setMessage(getRandomMessage('lose'))
        }

        // Reset bet state
        setHasBet(false)

        // Wait then start new round
        setTimeout(() => {
            startRound()
        }, 3000)
    }, [hasBet, hasCashedOut, saveHistory, startRound])

    // Place bet
    const placeBet = async () => {
        if (!zimBetAccount || phase !== 'betting' || hasBet) return

        const bet = Math.floor(betAmount)
        if (bet < 1 || bet > zimBetAccount.balance) {
            setMessage('Invalid bet amount!')
            return
        }

        // Deduct bet
        await supabase
            .from('zimbet_accounts')
            .update({ balance: Math.floor(zimBetAccount.balance - bet) })
            .eq('id', zimBetAccount.id)

        setHasBet(true)
        setMessage(`Bet placed: ${formatMoney(bet)}`)
        refreshAccount()
    }

    // Cash out
    const cashout = async () => {
        if (!zimBetAccount || phase !== 'flying' || !hasBet || hasCashedOut) return

        const bet = Math.floor(betAmount)
        const won = Math.floor(bet * multiplier)

        // Add winnings
        await supabase
            .from('zimbet_accounts')
            .update({
                balance: Math.floor(zimBetAccount.balance + won),
                total_wins: zimBetAccount.total_wins + 1,
                total_earnings: Math.floor(zimBetAccount.total_earnings + (won - bet))
            })
            .eq('id', zimBetAccount.id)

        setHasCashedOut(true)
        setCashoutMultiplier(multiplier)
        setWinnings(won)
        setMessage(multiplier >= 3 ? getRandomMessage('bigWin') : getRandomMessage('win'))

        if (multiplier >= 3) {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 3500)
        }

        refreshAccount()
    }

    // Start game loop on mount
    useEffect(() => {
        startRound()
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [])

    const getMultiplierColor = () => {
        if (phase === 'crashed') return '#ef4444'
        if (multiplier < 1.5) return '#60a5fa'
        if (multiplier < 2) return '#34d399'
        if (multiplier < 3) return '#fbbf24'
        if (multiplier < 5) return '#f97316'
        return '#ef4444'
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
                    <span className="game-icon">✈️</span>
                    <span>Aviator</span>
                </div>
                <div className="balance">
                    {formatMoney(zimBetAccount?.balance || 0)}
                </div>
            </header>

            {/* History Bar */}
            <div className="history-bar">
                {history.map((crash, i) => (
                    <span
                        key={i}
                        className={`history-chip ${crash < 2 ? 'low' : crash > 5 ? 'high' : 'mid'}`}
                    >
                        {crash.toFixed(2)}x
                    </span>
                ))}
                {history.length === 0 && <span className="no-history">No history yet</span>}
            </div>

            {/* Main Game Area */}
            <div className="game-area">
                <div className="flight-zone">
                    {/* Plane/Rocket */}
                    <div className={`plane ${phase}`}>
                        {phase === 'crashed' ? '💥' : '✈️'}
                    </div>

                    {/* Multiplier Display */}
                    <div
                        className={`multiplier ${phase}`}
                        style={{ color: getMultiplierColor() }}
                    >
                        {phase === 'waiting' ? 'Starting...' :
                            phase === 'betting' ? `${countdown}s` :
                                `${multiplier.toFixed(2)}x`}
                    </div>

                    {/* Status Label */}
                    <div className="status-label">
                        {phase === 'waiting' && 'Waiting for next round...'}
                        {phase === 'betting' && 'Place your bets!'}
                        {phase === 'flying' && 'Cash out now!'}
                        {phase === 'crashed' && `Crashed at ${crashPoint.toFixed(2)}x`}
                    </div>

                    {/* Cashout Result */}
                    {hasCashedOut && (
                        <div className="cashout-result">
                            <span className="cashout-mult">{cashoutMultiplier.toFixed(2)}x</span>
                            <span className="cashout-win">+{formatMoney(winnings)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bet Controls */}
            <div className="controls">
                {message && <div className="game-message">{message}</div>}

                <div className="bet-section">
                    <label>Bet Amount</label>
                    <div className="bet-buttons">
                        {BET_AMOUNTS.map(amt => (
                            <button
                                key={amt}
                                onClick={() => setBetAmount(amt)}
                                className={betAmount === amt ? 'active' : ''}
                                disabled={amt > (zimBetAccount?.balance || 0) || hasBet}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action Button */}
                {phase === 'betting' && !hasBet && (
                    <button
                        className="action-btn bet"
                        onClick={placeBet}
                        disabled={betAmount > (zimBetAccount?.balance || 0)}
                    >
                        Place Bet {formatMoney(betAmount)}
                    </button>
                )}

                {phase === 'betting' && hasBet && (
                    <button className="action-btn waiting" disabled>
                        Waiting for takeoff...
                    </button>
                )}

                {phase === 'flying' && hasBet && !hasCashedOut && (
                    <button
                        className="action-btn cashout"
                        onClick={cashout}
                    >
                        Cash Out {formatMoney(Math.floor(betAmount * multiplier))}
                    </button>
                )}

                {phase === 'flying' && hasCashedOut && (
                    <button className="action-btn cashed" disabled>
                        Cashed Out ✓
                    </button>
                )}

                {phase === 'flying' && !hasBet && (
                    <button className="action-btn waiting" disabled>
                        Wait for next round...
                    </button>
                )}

                {phase === 'crashed' && (
                    <button className="action-btn crashed" disabled>
                        Next round in 3s...
                    </button>
                )}

                {phase === 'waiting' && (
                    <button className="action-btn waiting" disabled>
                        Starting...
                    </button>
                )}
            </div>
        </div>
    )
}
