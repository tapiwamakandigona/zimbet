import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatMoney } from '../../lib/gameEngine'
import { soundManager } from '../../lib/audio'
import { Confetti } from '../../components/Confetti'
import { getCurrentRound, getFakeBets, getRoundHistory } from '../../lib/aviatorEngine'
import type { AviatorState } from '../../lib/aviatorEngine'
import './Aviator.css'

interface Bet {
    user: string
    amount: number
    multiplier?: number
    win?: number
    isFake?: boolean
    cashoutPoint?: number // For fakes
}

export function Aviator() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const navigate = useNavigate()

    // Engine State
    const [gameState, setGameState] = useState<AviatorState | null>(null)
    const [multiplier, setMultiplier] = useState<number>(1.00)
    const [history, setHistory] = useState<number[]>([])
    const [nextRoundTime, setNextRoundTime] = useState<number>(5)

    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<number | undefined>(undefined)

    // Betting State
    const [betAmount, setBetAmount] = useState<number>(10)
    const [nextRoundBet, setNextRoundBet] = useState<boolean>(false)
    const [activeBet, setActiveBet] = useState<boolean>(false)
    const [cashedOut, setCashedOut] = useState<boolean>(false)
    const [winAmount, setWinAmount] = useState<number>(0)
    const [liveBets, setLiveBets] = useState<Bet[]>([])
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Refs for state access in loop
    const stateRef = useRef(gameState)
    const nextRoundBetRef = useRef(nextRoundBet)
    const betAmountRef = useRef(betAmount)
    const zimBetAccountRef = useRef(zimBetAccount)
    const activeBetRef = useRef(activeBet)
    const cashedOutRef = useRef(cashedOut)

    useEffect(() => { stateRef.current = gameState }, [gameState])
    useEffect(() => { nextRoundBetRef.current = nextRoundBet }, [nextRoundBet])
    useEffect(() => { betAmountRef.current = betAmount }, [betAmount])
    useEffect(() => { zimBetAccountRef.current = zimBetAccount }, [zimBetAccount])
    useEffect(() => { activeBetRef.current = activeBet }, [activeBet])
    useEffect(() => { cashedOutRef.current = cashedOut }, [cashedOut])

    // Fairness UI State
    const [showFairness, setShowFairness] = useState(false)
    const [clientSeedInput, setClientSeedInput] = useState('')

    const toggleFairness = () => {
        if (!showFairness) {
            // Load current seed when opening
            import('../../lib/aviatorEngine').then(mod => {
                setClientSeedInput(mod.getClientSeed())
            })
        }
        setShowFairness(!showFairness)
    }

    const saveClientSeed = () => {
        import('../../lib/aviatorEngine').then(mod => {
            mod.setClientSeed(clientSeedInput)
            setShowFairness(false)
            alert('Client Seed Updated! Will apply to next round.')
        })
    }

    // Initialize History
    useEffect(() => {
        setHistory(getRoundHistory(20))
    }, [])

    // Multiplayer Channel
    useEffect(() => {
        const channel = supabase.channel('aviator_global')

        channel.on('broadcast', { event: 'new_bet' }, ({ payload }) => {
            // Add other players' bets
            if (payload.userId !== zimBetAccount?.id) {
                setLiveBets(prev => [{
                    user: payload.username,
                    amount: payload.amount,
                    isFake: false
                }, ...prev])
            }
        }).subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [zimBetAccount])

    const broadcastBet = async (amount: number) => {
        if (!zimBetAccount) return
        await supabase.channel('aviator_global').send({
            type: 'broadcast',
            event: 'new_bet',
            payload: {
                userId: zimBetAccount.id,
                username: zimBetAccount.username,
                amount: amount
            }
        })
    }

    // Helper to execute a bet transaction
    const executeBetTransaction = async (amount: number) => {
        if (!zimBetAccountRef.current) return false

        const { error } = await supabase.from('zimbet_accounts')
            .update({ balance: Math.floor(zimBetAccountRef.current.balance - amount) })
            .eq('id', zimBetAccountRef.current.id)

        if (!error) {
            refreshAccount()
            return true
        }
        return false
    }

    // Helper to execute a refund transaction (reserved for future use)
    const _executeRefundTransaction = async (amount: number) => {
        if (!zimBetAccountRef.current) return false

        const { error } = await supabase.from('zimbet_accounts')
            .update({ balance: Math.floor(zimBetAccountRef.current.balance + amount) })
            .eq('id', zimBetAccountRef.current.id)

        if (!error) {
            refreshAccount()
            return true
        }
        return false
    }



    // --- GAME LOOP ---
    const lastRoundIdRef = useRef<string>('')
    const lastPhaseRef = useRef<string>('')

    const updateGame = useCallback(() => {
        const now = Date.now()
        const current = getCurrentRound(now)

        // Phase Transition Logic
        if (current.roundId !== lastRoundIdRef.current) {
            // New Round Started
            lastRoundIdRef.current = current.roundId

            // Generate History from PREVIOUS rounds?
            // For now, push the PREVIOUS round's crash to history if we tracked it
            // Ideally we get history from the engine directly (by getting previous array items)
            // Simpler: Just ensure history has checks

            // Reset for new round
            setLiveBets(getFakeBets(current.roundId))
            setCashedOut(false)
            setWinAmount(0)
            setErrorMsg(null)

            // Handle Auto-Bet / Queue
            if (nextRoundBetRef.current) {
                const amount = betAmountRef.current
                executeBetTransaction(amount).then(success => {
                    if (success) {
                        setActiveBet(true)
                        setNextRoundBet(false)
                        broadcastBet(amount)
                    } else {
                        setNextRoundBet(false)
                        setErrorMsg('Insufficient balance')
                    }
                })
            } else {
                setActiveBet(false)
            }
        }

        if (current.phase !== lastPhaseRef.current) {
            // Phase Changed
            if (current.phase === 'flying') {
                soundManager.playAction() // Takeoff sound
            } else if (current.phase === 'crashed') {
                soundManager.playLoss()

                // Save history
                setHistory(prev => [current.crashPoint, ...prev].slice(0, 20))

                // Handle Loss
                if (activeBetRef.current && !cashedOutRef.current) {
                    if (zimBetAccountRef.current) {
                        supabase.from('zimbet_accounts').update({
                            total_losses: zimBetAccountRef.current.total_losses + 1,
                            total_earnings: zimBetAccountRef.current.total_earnings - betAmountRef.current
                        }).eq('id', zimBetAccountRef.current.id).then(() => refreshAccount())
                    }
                }

                setActiveBet(false)
            }
            lastPhaseRef.current = current.phase
        }

        // Update Calculated Stats
        if (current.phase === 'waiting') {
            setNextRoundTime(Math.max(0, (current.startTime - now) / 1000))
            setMultiplier(1.00)
        } else if (current.phase === 'flying') {
            // In Engine: startTime is waiting start. duration includes waiting.
            // Flight starts at startTime + 5000
            const flightElapsed = (now - (current.startTime + 5000)) / 1000
            if (flightElapsed > 0) {
                const m = Math.max(1, Math.pow(Math.E, flightElapsed * 0.12))
                setMultiplier(m)
            }
        } else {
            setMultiplier(current.crashPoint)
        }

        // Fake Cashouts Logic
        if (current.phase === 'flying') {
            setLiveBets(prev => prev.map(bet => {
                if (bet.isFake && !bet.multiplier && bet.cashoutPoint && multiplier >= bet.cashoutPoint) {
                    return { ...bet, multiplier: bet.cashoutPoint }
                }
                return bet
            }))
        }

        setGameState(current)
        drawFrame(current, now)

        animationRef.current = requestAnimationFrame(updateGame)
    }, []) // No dependencies, refs used

    const drawFrame = (state: AviatorState, now: number) => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        const width = canvas.width
        const height = canvas.height
        ctx.clearRect(0, 0, width, height)

        // Draw Grid
        ctx.strokeStyle = 'rgba(42, 43, 46, 0.5)'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i < width; i += width / 10) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
        for (let i = 0; i < height; i += height / 10) { ctx.moveTo(0, i); ctx.lineTo(width, i); }
        ctx.stroke()

        if (state.phase === 'waiting') return

        // Calculate curve
        // We want a visual curve that grows with time.
        // Normalize based on time, capped at say 10 seconds for visual width
        const flightElapsed = (now - (state.startTime + 5000)) / 1000
        const visualProgress = Math.min(1, flightElapsed / 8)

        const p0 = { x: 0, y: height }
        const p1 = { x: width * 0.4, y: height }
        const p2 = { x: width - 60, y: 60 }

        const t = visualProgress
        const bx = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x
        const by = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y

        // Draw fill area
        const grd = ctx.createLinearGradient(0, height, bx, by)
        grd.addColorStop(0, 'rgba(226, 51, 51, 0.2)')
        grd.addColorStop(1, 'rgba(226, 51, 51, 0.6)')

        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.moveTo(0, height)
        ctx.quadraticCurveTo(p1.x * t, height - (height - by) * 0.3, bx, by)
        ctx.lineTo(bx, height)
        ctx.closePath()
        ctx.fill()

        // Draw Curve Line
        ctx.shadowColor = '#e23333'
        ctx.shadowBlur = 20
        ctx.strokeStyle = '#e23333'
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(0, height)
        ctx.quadraticCurveTo(p1.x * t, height - (height - by) * 0.3, bx, by)
        ctx.stroke()
        ctx.shadowBlur = 0

        // Draw Plane
        ctx.translate(bx, by)
        // Angle depends on derivative or just heuristic
        // At t=0, angle is flat? No. Plane takes off.
        const rotation = -Math.atan2(height - by, bx) * 0.6
        ctx.rotate(rotation + 0.1)

        ctx.font = '36px Arial'
        ctx.fillStyle = 'white'
        ctx.fillText('✈️', -18, 9)
        ctx.resetTransform()
    }

    useEffect(() => {
        // Resize
        const resize = () => {
            if (canvasRef.current && containerRef.current) {
                const ratio = window.devicePixelRatio || 1
                const w = containerRef.current.clientWidth
                const h = containerRef.current.clientHeight
                canvasRef.current.width = w * ratio
                canvasRef.current.height = h * ratio
                canvasRef.current.style.width = `${w}px`
                canvasRef.current.style.height = `${h}px`
                const ctx = canvasRef.current.getContext('2d')
                if (ctx) ctx.scale(ratio, ratio)
            }
        }
        window.addEventListener('resize', resize)
        resize()

        // Start Loop
        animationRef.current = requestAnimationFrame(updateGame)

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
            window.removeEventListener('resize', resize)
        }
    }, [updateGame])

    const handleCashout = async () => {
        if (!activeBet || cashedOut) return

        // Check if we are actually allowed to cashout (not crashed)
        // Using refs to be safe, but local multiplier state should be update-to-date enough for UI
        // Strict check:
        const now = Date.now()
        const current = getCurrentRound(now)
        if (current.phase === 'crashed') return

        const m = multiplier // Current displayed multiplier
        const win = Math.floor(betAmount * m)

        soundManager.playWin()
        setCashedOut(true)
        setWinAmount(win)

        if (zimBetAccount) {
            await supabase.from('zimbet_accounts').update({
                balance: Math.floor(zimBetAccount.balance + win),
                total_wins: zimBetAccount.total_wins + 1,
                total_earnings: Math.floor(zimBetAccount.total_earnings + (win - betAmount))
            }).eq('id', zimBetAccount.id)
            refreshAccount()
        }
    }

    const handlePlaceBet = async () => {
        if (!zimBetAccount) return
        soundManager.playClick()

        const amount = Math.floor(betAmount)
        if (amount < 1 || amount > zimBetAccount.balance) {
            setErrorMsg('Invalid amount or balance')
            return
        }

        if (gameState?.phase === 'waiting') {
            const success = await executeBetTransaction(amount)
            if (success) {
                setActiveBet(true)
                setNextRoundBet(false)
                setErrorMsg(null)
                broadcastBet(amount)
            }
        } else {
            setNextRoundBet(true)
            setErrorMsg(null)
        }
    }

    const cancelBet = () => {
        if (nextRoundBet) {
            setNextRoundBet(false)
        }
    }

    return (
        <div className="aviator-container">
            <Confetti trigger={Boolean(cashedOut && multiplier > 3)} />

            <div className="aviator-layout">
                {/* LEFT SIDEBAR */}
                <div className="bets-sidebar">
                    <div className="sidebar-header">
                        <span className="tab active">All Bets ({liveBets.length})</span>
                        <span className="tab">My Bets</span>
                    </div>
                    <div className="bets-list-header">
                        <span>User</span>
                        <span>Bet</span>
                        <span>Mult</span>
                    </div>
                    <div className="bets-list">
                        {liveBets.map((bet, i) => (
                            <div key={i} className={`bet-row ${bet.multiplier ? 'win' : ''}`}>
                                <span className="user-col">
                                    <div className="avatar-placeholder" style={{ background: `hsl(${i * 45}, 60%, 50%)` }}></div>
                                    {bet.user}
                                </span>
                                <span className="amt-col">{bet.amount}</span>
                                <span className="mult-col">
                                    {bet.multiplier ? (
                                        <span className="cashed-badge">{bet.multiplier.toFixed(2)}x</span>
                                    ) : '-'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MAIN STAGE */}
                <div className="main-stage">
                    <div className="top-bar">
                        <div className="logo" onClick={() => navigate('/dashboard')}>
                            <span className="red-text">Aviator</span>
                            <span className="live-badge">LIVE</span>
                        </div>
                        <div className="history-scroller">
                            {history.map((h, i) => (
                                <div key={i} className={`history-pill ${h < 2 ? 'blue' : h < 10 ? 'purple' : 'pink'}`}>
                                    {h.toFixed(2)}x
                                </div>
                            ))}
                        </div>
                        <div className="wallet-pill">
                            <span className="green-text">{formatMoney(zimBetAccount?.balance || 0)}</span>
                            <button className="menu-btn" onClick={() => navigate('/dashboard')}>EXIT</button>
                            <button className="menu-btn" style={{ background: '#2ecc71', marginLeft: '8px' }} onClick={toggleFairness}>FAIR</button>
                        </div>
                    </div>

                    {/* Game Canvas */}
                    <div className="canvas-wrapper" ref={containerRef}>
                        <canvas ref={canvasRef} />
                        <div className="multiplier-overlay">
                            {gameState?.phase === 'waiting' ? (
                                <div className="waiting-state">
                                    <div className="countdown-ring">
                                        <span>{(nextRoundTime || 0).toFixed(1)}s</span>
                                    </div>
                                    <span className="waiting-text">WAITING FOR NEXT ROUND</span>
                                </div>
                            ) : gameState?.phase === 'crashed' ? (
                                <div className="crash-state">
                                    <span className="crash-text">FLEW AWAY!</span>
                                    <span className="crash-mult">{gameState.crashPoint.toFixed(2)}x</span>
                                </div>
                            ) : (
                                <span className="flying-mult">{multiplier.toFixed(2)}x</span>
                            )}
                        </div>
                        {cashedOut && (
                            <div className="cashout-overlay">
                                <span className="win-label">YOU WON</span>
                                <span className="win-amount">{formatMoney(winAmount)}</span>
                                <span className="win-mult">@ {multiplier.toFixed(2)}x</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDEBAR - Betting Panel */}
                <div className="betting-sidebar">
                    <div className="bet-panel">
                        <div className="amount-row">
                            <button className="adj-btn" onClick={() => setBetAmount(Math.max(1, betAmount - 10))}>-</button>
                            <input
                                type="number"
                                value={betAmount}
                                onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
                                className="amount-input"
                            />
                            <button className="adj-btn" onClick={() => setBetAmount(betAmount + 10)}>+</button>
                        </div>
                        <div className="quick-amounts">
                            {[10, 25, 50, 100, 250, 500].map(amt => (
                                <button key={amt} onClick={() => setBetAmount(amt)} className="quick-btn">{amt}</button>
                            ))}
                        </div>

                        {errorMsg && <div className="error-msg">{errorMsg}</div>}

                        {!activeBet && !nextRoundBet ? (
                            <button className="bet-btn" onClick={handlePlaceBet}>
                                BET {formatMoney(betAmount)}
                            </button>
                        ) : activeBet && !cashedOut ? (
                            <button className="cashout-btn" onClick={handleCashout}>
                                CASH OUT<br />
                                <span className="cashout-value">{formatMoney(Math.floor(betAmount * multiplier))}</span>
                            </button>
                        ) : nextRoundBet ? (
                            <button className="queued-btn" onClick={cancelBet}>
                                QUEUED: {formatMoney(betAmount)}<br />
                                <span className="cancel-hint">Tap to cancel</span>
                            </button>
                        ) : (
                            <button className="bet-btn" onClick={handlePlaceBet}>
                                BET NEXT ROUND
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Fairness Modal */}
            {showFairness && (
                <div className="fairness-overlay" onClick={toggleFairness}>
                    <div className="fairness-modal" onClick={e => e.stopPropagation()}>
                        <h2>Provably Fair</h2>
                        <p>Each round's outcome is determined by a cryptographic hash combining server and client seeds.</p>

                        <div className="seed-info">
                            <label>Server Seed (Hidden)</label>
                            <input readOnly value="************" />
                        </div>

                        <div className="seed-info">
                            <label>Your Client Seed</label>
                            <input
                                value={clientSeedInput}
                                onChange={(e) => setClientSeedInput(e.target.value)}
                                placeholder="Enter your seed"
                            />
                        </div>

                        <div className="fairness-actions">
                            <button onClick={saveClientSeed}>Save Seed</button>
                            <button onClick={toggleFairness}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

