import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { generateAviatorCrashPoint, formatMoney } from '../../lib/gameEngine'
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
    const [nextRoundBet, setNextRoundBet] = useState<boolean>(false) // Bet placed for NEXT round
    const [activeBet, setActiveBet] = useState<boolean>(false) // Bet active in CURRENT round
    const [cashedOut, setCashedOut] = useState<boolean>(false)
    const [winAmount, setWinAmount] = useState<number>(0)
    const [liveBets, setLiveBets] = useState<Bet[]>([])

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

    // --- GAME LOOP ---

    const startGame = useCallback(() => {
        setPhase('waiting')
        setMultiplier(1.00)
        setCashedOut(false)
        setWinAmount(0)

        // Check if we have a queued bet
        if (nextRoundBet) {
            if (zimBetAccount && zimBetAccount.balance >= betAmount) {
                // Deduct balance
                supabase.from('zimbet_accounts')
                    .update({ balance: Math.floor(zimBetAccount.balance - betAmount) })
                    .eq('id', zimBetAccount.id)
                    .then(() => refreshAccount())

                setActiveBet(true)
                setNextRoundBet(false)
            } else {
                setNextRoundBet(false) // Insufficient funds, cancel bet
            }
        } else {
            setActiveBet(false)
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
    }, [nextRoundBet, betAmount, zimBetAccount, refreshAccount])

    const startFlight = useCallback(() => {
        setPhase('flying')
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
        const currentMult = Math.max(1, Math.pow(Math.E, elapsed * 0.1))

        setMultiplier(currentMult)

        // Update fake bets (randomly cash out)
        setLiveBets(prev => prev.map(bet => {
            if (!bet.multiplier && Math.random() < 0.05 && currentMult > 1.1) {
                return { ...bet, multiplier: currentMult, win: Math.floor(bet.amount * currentMult) }
            }
            return bet
        }))

        // Check crash
        if (currentMult >= crashPointRef.current) {
            handleCrash(crashPointRef.current)
            return
        }

        // Drawing Logic
        const width = canvas.width
        const height = canvas.height

        ctx.clearRect(0, 0, width, height)

        // Draw Grid
        ctx.strokeStyle = '#2a2b2e'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i < width; i += 50) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
        for (let i = 0; i < height; i += 50) { ctx.moveTo(0, i); ctx.lineTo(width, i); }
        ctx.stroke()

        // Plane Animation Logic
        // Plane starts bottom left, moves to top right
        // We use a visual progress time of about 5 seconds to traverse the canvas
        // even if the game goes longer (plane just stays at top right shaking)

        const visualProgress = Math.min(1, elapsed / 5)

        // Calculate curve point
        // Quadratic Bezier: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        const p0 = { x: 0, y: height }
        const p1 = { x: width * 0.6, y: height } // Control point
        const p2 = { x: width - 80, y: 100 } // End point

        const t = visualProgress
        const bx = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x
        const by = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y

        // Draw fill area
        ctx.fillStyle = 'rgba(226, 51, 51, 0.4)' // Red transparent
        ctx.beginPath()
        ctx.moveTo(0, height)
        ctx.quadraticCurveTo(p1.x * t, height - (height - by) * 0.5, bx, by) // Approx fill using current point
        ctx.lineTo(bx, height)
        ctx.lineTo(0, height)
        ctx.fill()

        // Draw Curve Line
        ctx.shadowColor = '#e23333'
        ctx.shadowBlur = 15
        ctx.strokeStyle = '#e23333'
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(0, height)
        ctx.quadraticCurveTo(p1.x * t, height - (height - by) * 0.5, bx, by)
        ctx.stroke()
        ctx.shadowBlur = 0

        // Draw Plane
        ctx.translate(bx, by)
        // Rotate calculated by derivative of quadratic bezier could be better, 
        // but fixed rotation for simple "takeoff" look works too
        const rotation = -Math.atan2(height - by, bx) * 0.5 // Simple visual tilt
        ctx.rotate(rotation + 0.2) // Adjustment

        ctx.font = '40px Arial'
        ctx.fillStyle = 'white'
        ctx.fillText('✈️', -20, 10)
        ctx.resetTransform() // Reset for next frame

        animationRef.current = requestAnimationFrame(drawFrame)
    }, [])

    const handleCrash = useCallback((crashVal: number) => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
        setPhase('crashed')
        setMultiplier(crashVal)
        saveHistory(crashVal)

        if (activeBet && !cashedOut) {
            // Player lost
            supabase.from('zimbet_accounts')
                .update({
                    total_losses: zimBetAccount!.total_losses + 1,
                    total_earnings: zimBetAccount!.total_earnings - betAmount
                })
                .eq('id', zimBetAccount!.id)
                .then(() => refreshAccount())
        }

        setTimeout(() => {
            startGame()
        }, 3000)
    }, [activeBet, cashedOut, betAmount, zimBetAccount, refreshAccount, saveHistory, startGame])

    const handleCashout = async () => {
        if (phase !== 'flying' || !activeBet || cashedOut) return

        setCashedOut(true)
        const currentMult = multiplier
        const win = Math.floor(betAmount * currentMult)
        setWinAmount(win)

        // Update DB
        if (zimBetAccount) {
            await supabase.from('zimbet_accounts').update({
                balance: Math.floor(zimBetAccount.balance + win),
                total_wins: zimBetAccount.total_wins + 1,
                total_earnings: Math.floor(zimBetAccount.total_earnings + (win - betAmount))
            }).eq('id', zimBetAccount.id)
            refreshAccount()
        }
    }

    const toggleBet = () => {
        if (activeBet || nextRoundBet) {
            // Cancel bet
            setNextRoundBet(false)
        } else {
            // Place bet for next round
            setNextRoundBet(true)
        }
    }

    // Effect to handle canvas resizing
    useEffect(() => {
        const resize = () => {
            if (canvasRef.current && containerRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth
                canvasRef.current.height = containerRef.current.clientHeight
            }
        }
        window.addEventListener('resize', resize)
        resize()
        return () => window.removeEventListener('resize', resize)
    }, [])

    // Start game on mount
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
                {/* LEFT SIDEBAR - BETS */}
                <div className="bets-sidebar">
                    <div className="sidebar-header">
                        <span className="tab active">All Bets</span>
                        <span className="tab">My Bets</span>
                        <span className="tab">Top</span>
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
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.user}`} alt="avatar" className="avatar-tiny" />
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

                {/* MAIN GAME AREA */}
                <div className="main-stage">
                    {/* TOP BAR */}
                    <div className="top-bar">
                        <div className="logo">
                            <span className="red-text">Aviator</span>
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
                            <button className="menu-btn" onClick={() => navigate('/dashboard')}>Exit</button>
                        </div>
                    </div>

                    {/* CANVAS CONTAINER */}
                    <div className="canvas-wrapper" ref={containerRef}>
                        <canvas ref={canvasRef} />

                        {/* OVERLAYS */}
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

                    {/* CONTROLS AREA - EXACT REPLICA */}
                    <div className="controls-area">
                        {/* We use 2 control panels to look like the real game, only left 1 works */}
                        <div className="control-panel active-panel">
                            <div className="bet-input-row">
                                <div className="counter">
                                    <button onClick={() => setBetAmount(b => Math.max(1, b - 1))}>−</button>
                                    <input value={betAmount} readOnly />
                                    <button onClick={() => setBetAmount(b => b + 1)}>+</button>
                                </div>
                                <div className="quick-select">
                                    {[1, 2, 5, 10].map(n => (
                                        <button key={n} onClick={() => setBetAmount(n)}>{n}</button>
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
                                            <button className="bet-btn cancel" onClick={toggleBet}>
                                                <div className="btn-label">CANCEL</div>
                                                <div className="btn-sub">BET</div>
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
                                        <button className="bet-btn cancel" onClick={toggleBet}>
                                            <div className="btn-label">WAITING</div>
                                            <div className="btn-sub">CANCEL BET</div>
                                        </button>
                                    ) : (
                                        <button className="bet-btn place" onClick={toggleBet}>
                                            <div className="btn-label">BET</div>
                                            <div className="btn-val">{formatMoney(betAmount)}</div>
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Dummy 2nd Panel for authenticity */}
                        <div className="control-panel faded-panel">
                            <div className="bet-input-row">
                                <div className="counter">
                                    <button disabled>−</button>
                                    <input value="10" readOnly />
                                    <button disabled>+</button>
                                </div>
                                <div className="quick-select">
                                    <button>1</button><button>2</button><button>5</button><button>10</button>
                                </div>
                            </div>
                            <div className="main-action">
                                <button className="bet-btn place" disabled>
                                    <div className="btn-label">BET</div>
                                    <div className="btn-val">$10.00</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
