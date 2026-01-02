import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { generateAviatorCrashPoint, formatMoney } from '../../lib/gameEngine'
import { soundManager } from '../../lib/audio' // Import audio
import { Confetti } from '../../components/Confetti'
import './Aviator.css'

type GamePhase = 'waiting' | 'flying' | 'crashed'

interface Bet {
    user: string
    amount: number
    multiplier?: number
    win?: number
}

const FAKE_USERS = ['User123', 'AviatorKing', 'LuckyGirl', 'Speedy', 'PilotToMoon', 'CrashMaster', 'ZeroRisk', 'BigWinner', 'CryptoFan', 'ZimChamp']

export function Aviator() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const navigate = useNavigate()

    // Game state
    const [phase, setPhase] = useState<GamePhase>('waiting')
    const [multiplier, setMultiplier] = useState<number>(1.00)
    const [history, setHistory] = useState<number[]>([])
    const [nextRoundTime, setNextRoundTime] = useState<number>(5)

    // Canvas & Animation refs
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<number | undefined>(undefined)
    const startTimeRef = useRef<number>(0)
    const crashPointRef = useRef<number>(0)

    // Betting State
    const [betAmount, setBetAmount] = useState<number>(10)
    const [nextRoundBet, setNextRoundBet] = useState<boolean>(false)
    const [activeBet, setActiveBet] = useState<boolean>(false)
    const [cashedOut, setCashedOut] = useState<boolean>(false)
    const [winAmount, setWinAmount] = useState<number>(0)
    const [liveBets, setLiveBets] = useState<Bet[]>([])
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Refs for state access in callbacks
    const nextRoundBetRef = useRef(nextRoundBet)
    const betAmountRef = useRef(betAmount)
    const zimBetAccountRef = useRef(zimBetAccount)

    useEffect(() => { nextRoundBetRef.current = nextRoundBet }, [nextRoundBet])
    useEffect(() => { betAmountRef.current = betAmount }, [betAmount])
    useEffect(() => { zimBetAccountRef.current = zimBetAccount }, [zimBetAccount])

    // Load history
    useEffect(() => {
        const saved = localStorage.getItem('aviator_history')
        if (saved) setHistory(JSON.parse(saved))
    }, [])

    const saveHistory = useCallback((crash: number) => {
        setHistory(prev => {
            const newHistory = [crash, ...prev].slice(0, 20)
            localStorage.setItem('aviator_history', JSON.stringify(newHistory))
            return newHistory
        })
    }, [])

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

    // --- GAME LOOP ---

    const startGame = useCallback(async () => {
        setPhase('waiting')
        setMultiplier(1.00)
        setCashedOut(false)
        setWinAmount(0)
        setErrorMsg(null)

        // Process Queued Bet
        if (nextRoundBetRef.current) {
            const amount = betAmountRef.current
            if (zimBetAccountRef.current && zimBetAccountRef.current.balance >= amount) {
                const success = await executeBetTransaction(amount)
                if (success) {
                    setActiveBet(true)
                    setNextRoundBet(false)
                    // soundManager.playAction() - maybe too noisy on auto?
                } else {
                    setNextRoundBet(false)
                    setErrorMsg('Balance too low for queued bet')
                }
            } else {
                setNextRoundBet(false)
                setErrorMsg('Balance too low for queued bet')
            }
        }

        // Generate fake bets for this round
        const roundBets: Bet[] = Array.from({ length: 15 }, () => ({
            user: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)],
            amount: Math.floor(Math.random() * 500) + 10
        })).sort((a, b) => b.amount - a.amount)
        setLiveBets(roundBets)

        // Countdown
        let timeLeft = 5
        setNextRoundTime(timeLeft)
        const timer = setInterval(() => {
            timeLeft -= 0.1
            setNextRoundTime(Math.max(0, timeLeft))

            if (timeLeft <= 0) {
                clearInterval(timer)
                startFlight()
            }
        }, 100)
    }, []) // Dependencies intentionally minimal as we use Refs

    const startFlight = useCallback(() => {
        setPhase('flying')
        soundManager.playAction()
        startTimeRef.current = Date.now()
        crashPointRef.current = generateAviatorCrashPoint()

        // Start animation loop
        drawFrame()
    }, [])

    const drawFrame = useCallback(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        const elapsed = (Date.now() - startTimeRef.current) / 1000
        const currentMult = Math.max(1, Math.pow(Math.E, elapsed * 0.12)) // Slightly faster

        setMultiplier(currentMult)

        // Update fake bets (randomly cash out)
        setLiveBets(prev => prev.map(bet => {
            if (!bet.multiplier && Math.random() < 0.03 && currentMult > 1.2) {
                return { ...bet, multiplier: currentMult, win: Math.floor(bet.amount * currentMult) }
            }
            return bet
        }))

        // Check crash
        if (currentMult >= crashPointRef.current) {
            handleCrash(crashPointRef.current)
            return
        }

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

        const visualProgress = Math.min(1, elapsed / 8)

        const p0 = { x: 0, y: height }
        const p1 = { x: width * 0.4, y: height }
        const p2 = { x: width - 60, y: 60 }

        const t = visualProgress
        const bx = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x
        const by = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y

        // Draw fill area with gradient
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

        // Draw Curve Line with glow
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
        const rotation = -Math.atan2(height - by, bx) * 0.6
        ctx.rotate(rotation + 0.1)

        ctx.font = '36px Arial'
        ctx.fillStyle = 'white'
        ctx.fillText('✈️', -18, 9)
        ctx.resetTransform()

        animationRef.current = requestAnimationFrame(drawFrame)
    }, [])

    const handleCrash = useCallback((crashVal: number) => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
        setPhase('crashed')
        setMultiplier(crashVal)
        saveHistory(crashVal)
        soundManager.playLoss()

        if (activeBet && !cashedOut) {
            // Player lost - update DB
            if (zimBetAccount) {
                supabase.from('zimbet_accounts')
                    .update({
                        total_losses: zimBetAccount.total_losses + 1,
                        total_earnings: zimBetAccount.total_earnings - betAmount
                    })
                    .eq('id', zimBetAccount.id)
                    .then(() => refreshAccount())
            }
        }

        // Reset betting states
        setActiveBet(false)

        setTimeout(() => {
            startGame()
        }, 3000)
    }, [activeBet, cashedOut, betAmount, zimBetAccount, refreshAccount, saveHistory, startGame])

    const handleCashout = async () => {
        if (phase !== 'flying' || !activeBet || cashedOut) return

        soundManager.playWin()
        const currentMult = multiplier
        const win = Math.floor(betAmount * currentMult)

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

    // --- ENHANCED BETTING LOGIC ---
    const handlePlaceBet = async () => {
        if (!zimBetAccount) return
        soundManager.playClick()

        const amount = Math.floor(betAmount)
        if (amount < 1 || amount > zimBetAccount.balance) {
            setErrorMsg('Invalid amount or balance')
            return
        }

        if (phase === 'waiting') {
            // Place bet IMMEDIATELY for CURRENT round
            const success = await executeBetTransaction(amount)
            if (success) {
                setActiveBet(true)
                setNextRoundBet(false)
                setErrorMsg(null)
            }
        } else {
            // Queue bet for NEXT round
            setNextRoundBet(true)
            setErrorMsg(null)
        }
    }

    const cancelBet = () => {
        // Only allow cancel if it's next round bet OR active but round hasn't started
        if (nextRoundBet) {
            setNextRoundBet(false)
        } else if (activeBet && phase === 'waiting') {
            // Refund - this is a simplification, real games allow cancel during waiting
            // For logic simplicity, we'll just toggle the state if user hasn't confirmed
            // but if they already deducted balance we should refund.
            // Letting just nextRoundBet be the queue and activeBet be the confirmed.

            // If activeBet is true, balance was ALREADY deducted.
            // Let's implement refund
            if (zimBetAccount) {
                supabase.from('zimbet_accounts')
                    .update({ balance: Math.floor(zimBetAccount.balance + betAmount) })
                    .eq('id', zimBetAccount.id)
                    .then(() => {
                        setActiveBet(false)
                        refreshAccount()
                    })
            }
        }
    }

    // Effect to handle canvas resizing and scaling for High DPI
    useEffect(() => {
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
        return () => window.removeEventListener('resize', resize)
    }, [])

    // Start game loop on mount
    useEffect(() => {
        startGame()
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [])

    return (
        <div className="aviator-container">
            <Confetti trigger={Boolean(cashedOut && multiplier > 3)} />

            <div className="aviator-layout">
                {/* LEFT SIDEBAR */}
                <div className="bets-sidebar">
                    <div className="sidebar-header">
                        <span className="tab active">All Bets</span>
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
                        </div>
                        <div className="history-scroller">
                            {history.slice(0, 10).map((h, i) => (
                                <div key={i} className={`history-pill ${h < 2 ? 'blue' : h < 10 ? 'purple' : 'pink'}`}>
                                    {h.toFixed(2)}x
                                </div>
                            ))}
                        </div>
                        <div className="wallet-pill">
                            <span className="green-text">{formatMoney(zimBetAccount?.balance || 0)}</span>
                            <button className="menu-btn" onClick={() => navigate('/dashboard')}>EXIT</button>
                        </div>
                    </div>

                    <div className="canvas-wrapper" ref={containerRef}>
                        <canvas ref={canvasRef} />

                        {phase === 'waiting' && (
                            <div className="waiting-overlay">
                                <div className="loader-spinner"></div>
                                <div className="waiting-text">WAITING FOR NEXT ROUND</div>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${(nextRoundTime / 5) * 100}%` }}></div>
                                </div>
                            </div>
                        )}

                        {phase === 'flying' && (
                            <div className="flying-stats">
                                <div className="big-multiplier">{multiplier.toFixed(2)}x</div>
                            </div>
                        )}

                        {phase === 'crashed' && (
                            <div className="crashed-overlay">
                                <div className="flew-away">FLEW AWAY!</div>
                                <div className="crashed-mult">{multiplier.toFixed(2)}x</div>
                            </div>
                        )}
                    </div>

                    <div className="controls-area">
                        <div className="control-panel">
                            {errorMsg && <div className="bet-error">{errorMsg}</div>}
                            <div className="bet-input-row">
                                <div className="counter">
                                    <button onClick={() => setBetAmount(b => Math.max(1, b - 1))}>−</button>
                                    <input value={betAmount} readOnly />
                                    <button onClick={() => setBetAmount(b => b + 1)}>+</button>
                                </div>
                                <div className="quick-select">
                                    {[1, 5, 10, 50].map(n => (
                                        <button key={n} onClick={() => setBetAmount(n)}>${n}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="main-action">
                                {activeBet ? (
                                    cashedOut ? (
                                        <button className="bet-btn success" disabled>
                                            <div className="btn-label">CASHED OUT</div>
                                            <div className="btn-val">{formatMoney(winAmount)}</div>
                                        </button>
                                    ) : (
                                        phase === 'waiting' ? (
                                            <button className="bet-btn cancel" onClick={cancelBet}>
                                                <div className="btn-label">CANCEL</div>
                                                <div className="btn-sub">WAITING...</div>
                                            </button>
                                        ) : (
                                            <button className="bet-btn cashout" onClick={handleCashout}>
                                                <div className="btn-label">CASH OUT</div>
                                                <div className="btn-val">{formatMoney(Math.floor(betAmount * multiplier))}</div>
                                            </button>
                                        )
                                    )
                                ) : (
                                    nextRoundBet ? (
                                        <button className="bet-btn cancel" onClick={cancelBet}>
                                            <div className="btn-label">CANCEL</div>
                                            <div className="btn-sub">NEXT ROUND</div>
                                        </button>
                                    ) : (
                                        <button
                                            className="bet-btn place"
                                            onClick={handlePlaceBet}
                                            disabled={!zimBetAccount || betAmount > zimBetAccount.balance}
                                        >
                                            <div className="btn-label">BET</div>
                                            <div className="btn-val">${betAmount}</div>
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Secondary Interactive Panel */}
                        <div className="control-panel secondary-panel">
                            <div className="bet-header">Auto Options</div>
                            <div className="auto-controls">
                                <button className="auto-btn">Auto Bet</button>
                                <button className="auto-btn">Auto Cash Out</button>
                            </div>
                            <div className="dummy-info">Practice mode active</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
