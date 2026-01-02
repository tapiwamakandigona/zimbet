import { useEffect, useRef, useState, useCallback } from 'react'
import Matter from 'matter-js'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatMoney } from '../../lib/gameEngine'
import { soundManager } from '../../lib/audio'
import './Plinko.css'

export function Plinko() {
    const navigate = useNavigate()
    const { zimBetAccount, refreshAccount } = useAuth()

    // Game Config
    const [betAmount, setBetAmount] = useState(10)
    const [rows, setRows] = useState(16)
    const [lastWin, setLastWin] = useState<number | null>(null)
    const [inGame, setInGame] = useState(false) // If balls are dropping

    // Canvas & Engine Refs
    const sceneRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<Matter.Engine | null>(null)
    const renderRef = useRef<Matter.Render | null>(null)
    const runnerRef = useRef<Matter.Runner | null>(null)

    // State for balls in play (to prevent navigation away or track progress)
    const ballsRef = useRef<number>(0)

    // Multipliers for 16 rows (High Risk)
    // 16 rows = 17 buckets.
    // Center is 1 (index 8).
    // Extreme edges are 110x.
    const MULTIPLIERS = [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110]

    useEffect(() => {
        if (!sceneRef.current) return

        // 1. Setup Matter.js
        const Engine = Matter.Engine,
            Render = Matter.Render,
            Runner = Matter.Runner,
            Bodies = Matter.Bodies,
            Composite = Matter.Composite,
            Events = Matter.Events

        const engine = Engine.create()
        engineRef.current = engine

        const width = 800
        const height = 650

        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width,
                height,
                background: 'transparent',
                wireframes: false,
                pixelRatio: window.devicePixelRatio
            }
        })
        renderRef.current = render

        // 2. Build World
        const world = engine.world

        // Pins
        const pins: Matter.Body[] = []
        const startX = width / 2
        const startY = 50
        const rowGap = 35
        const colGap = 40

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c <= r; c++) {
                const x = startX - (r * colGap / 2) + (c * colGap)
                const y = startY + r * rowGap
                const pin = Bodies.circle(x, y, 3, {
                    isStatic: true,
                    render: { fillStyle: '#ffffff', opacity: 1 },
                    label: 'pin',
                    restitution: 0.8
                })
                pins.push(pin)
            }
        }
        Composite.add(world, pins)

        // Buckets / Walls
        // We need 17 buckets for 16 rows.
        // Buckets are at the bottom.
        const bucketY = startY + rows * rowGap + 20
        const bucketWidth = colGap
        console.log(bucketY) // approx 50 + 16*35 + 20 = 630

        const sensors: Matter.Body[] = []
        const walls: Matter.Body[] = []

        // Total width of base = rows * colGap.
        // Center x is startX.
        // Leftmost x = startX - (rows * colGap / 2)

        const totalBaseWidth = rows * colGap
        const baseStartX = startX - totalBaseWidth / 2

        for (let i = 0; i < MULTIPLIERS.length; i++) {
            const x = baseStartX + (i * colGap) + (colGap / 2) // Center of bucket
            // Create sensor for scoring
            const sensor = Bodies.rectangle(x, bucketY + 10, bucketWidth, 10, {
                isStatic: true,
                isSensor: true,
                label: `bucket-${MULTIPLIERS[i]}`,
                render: {
                    fillStyle: getMultiplierColor(MULTIPLIERS[i]),
                    opacity: 0.5
                }
            })
            sensors.push(sensor)

            // Create divider walls
            if (i < MULTIPLIERS.length) {
                // Wall between buckets
                const wallX = baseStartX + (i * colGap)
                const wall = Bodies.rectangle(wallX, bucketY, 2, 40, {
                    isStatic: true,
                    render: { fillStyle: '#333' }
                })
                walls.push(wall)
            }
        }
        // Final right wall
        walls.push(Bodies.rectangle(baseStartX + MULTIPLIERS.length * colGap, bucketY, 2, 40, {
            isStatic: true,
            render: { fillStyle: '#333' }
        }))

        Composite.add(world, [...sensors, ...walls])

        // 3. Collision Logic
        Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs
            pairs.forEach((pair) => {
                const bodyA = pair.bodyA
                const bodyB = pair.bodyB

                // Check Pin Hit (Sound)
                if ((bodyA.label === 'pin' && bodyB.label === 'ball') || (bodyB.label === 'pin' && bodyA.label === 'ball')) {
                    // soundManager.playHover() // Too loud if many balls
                }

                // Check Bucket Hit (Win)
                const bucket = bodyA.label.startsWith('bucket-') ? bodyA : bodyB.label.startsWith('bucket-') ? bodyB : null
                const ball = bodyA.label === 'ball' ? bodyA : bodyB.label === 'ball' ? bodyB : null

                if (bucket && ball) {
                    const multStr = bucket.label.split('-')[1]
                    const multiplier = parseFloat(multStr)
                    handleWin(new Number(ball.plugin.bet).valueOf(), multiplier)

                    // Remove ball
                    Composite.remove(world, ball)
                    ballsRef.current = Math.max(0, ballsRef.current - 1)
                    if (ballsRef.current === 0) setInGame(false)
                }
            })
        })

        // 4. Run
        Render.run(render)
        const runner = Runner.create()
        runnerRef.current = runner
        Runner.run(runner, engine)

        return () => {
            Render.stop(render)
            Runner.stop(runner)
            if (render.canvas) render.canvas.remove()
        }
    }, [rows]) // Re-init on row change would be complex, let's keep rows fixed 16 for now or force remount

    const getMultiplierColor = (m: number) => {
        if (m >= 10) return '#ef4444' // Red
        if (m >= 3) return '#f59e0b' // Orange
        return '#22c55e' // Green
    }

    const handleWin = async (bet: number, mult: number) => {
        const win = Math.floor(bet * mult)
        setLastWin(win)
        if (mult >= 1) soundManager.playWin()
        else soundManager.playLoss()

        if (zimBetAccountRef.current) {
            // Update DB
            // Note: Optimistic UI update handled via Account Context?
            // We use direct supabase call here for reliability
            // But we need to sync with AuthContext.
            // We'll update the ref locally? No, refreshAccount is better

            // To avoid "stale closure" on zimBetAccount, we use a ref if needed, or better, pass bet in ball plugin data
            // We passed 'bet' via ball.plugin.bet

            // We need to fetch latest balance to be safe, or just increment
            // Supabase increment is safer: balance = balance + win
            // But we already deducted bet.

            // Wait, we can't access zimBetAccount inside the event listener easily without Ref.
            // Using a Ref for account.
        }
        processWin(bet, win)
    }

    // Account Ref for Event Listener
    const zimBetAccountRef = useRef(zimBetAccount)
    useEffect(() => { zimBetAccountRef.current = zimBetAccount }, [zimBetAccount])

    const processWin = async (bet: number, win: number) => {
        if (!zimBetAccountRef.current) return

        const { error } = await supabase.rpc('update_balance', {
            p_user_id: zimBetAccountRef.current.id,
            p_amount: win
        })

        // If RPC not exists, fallback to standard update (racey)
        if (error) {
            // Fallback
            await supabase.from('zimbet_accounts')
                .update({
                    balance: zimBetAccountRef.current.balance + win,
                    total_wins: zimBetAccountRef.current.total_wins + (win > bet ? 1 : 0),
                    total_earnings: zimBetAccountRef.current.total_earnings + (win - bet)
                })
                .eq('id', zimBetAccountRef.current.id)
        }

        refreshAccount()
    }

    const dropBall = async () => {
        if (!zimBetAccount || betAmount > zimBetAccount.balance) return
        if (!engineRef.current) return

        soundManager.playClick()
        setInGame(true)
        ballsRef.current += 1

        // Deduct balance
        const { error } = await supabase.from('zimbet_accounts')
            .update({ balance: zimBetAccount.balance - betAmount, total_losses: zimBetAccount.total_losses + 1 }) // Counts as loss until win?
            .eq('id', zimBetAccount.id)

        if (error) {
            ballsRef.current -= 1
            return
        }

        refreshAccount()

        // Create Ball
        const x = 400 + (Math.random() * 2 - 1) // Tiny offset to create randomness
        const ball = Matter.Bodies.circle(x, 0, 8, {
            restitution: 0.5,
            friction: 0.5,
            label: 'ball',
            render: {
                fillStyle: '#ff007f'
            },
            plugin: {
                bet: betAmount
            }
        })

        Matter.Composite.add(engineRef.current.world, ball)
    }

    return (
        <div className="plinko-container">
            <div className="game-layout">
                {/* Sidebar */}
                <div className="controls-sidebar">
                    <div className="game-logo">PLINKO</div>

                    <div className="control-group">
                        <label>Bet Amount</label>
                        <div className="bet-input-row">
                            <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} />
                        </div>
                        <div className="quick-select">
                            {[10, 50, 100].map(n => (
                                <button key={n} onClick={() => setBetAmount(n)}>${n}</button>
                            ))}
                        </div>
                    </div>

                    <div className="control-group">
                        <label>Risk Level</label>
                        <select disabled>
                            <option>High (16 Rows)</option>
                        </select>
                    </div>

                    <button
                        className="play-btn"
                        onClick={dropBall}
                        disabled={!zimBetAccount || betAmount > zimBetAccount.balance}
                    >
                        DROP BALL
                    </button>

                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        EXIT
                    </button>
                </div>

                {/* Stage */}
                <div className="stage-area">
                    <div ref={sceneRef} className="canvas-wrapper"></div>

                    <div className="multipliers-display">
                        {MULTIPLIERS.map((m, i) => (
                            <div key={i}
                                className="mult-box"
                                style={{
                                    background: getMultiplierColor(m),
                                    height: `${20 + m * 2}px` // Visual height logic
                                }}
                            >
                                {m}x
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
