import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, MATCHMAKING_TIMEOUT, CHOICE_TIMEOUT, HOUSE_FEE_PERCENT } from '../lib/supabase'
import type { BetTier } from '../lib/supabase'
import './Game.css'

type Choice = 'rock' | 'paper' | 'scissors' | null
type GamePhase = 'matchmaking' | 'choosing' | 'revealing' | 'result'

const CHOICES = ['rock', 'paper', 'scissors'] as const
const CHOICE_EMOJIS = {
    rock: '🪨',
    paper: '📄',
    scissors: '✂️'
}

// Bot with slight patterns (beatable but not obvious)
const getBotChoice = (): Choice => {
    // Slightly favor rock (40% rock, 30% paper, 30% scissors)
    const rand = Math.random()
    if (rand < 0.4) return 'rock'
    if (rand < 0.7) return 'paper'
    return 'scissors'
}

const getWinner = (p1: Choice, p2: Choice): 'p1' | 'p2' | 'draw' => {
    if (!p1 || !p2) return 'draw'
    if (p1 === p2) return 'draw'
    if (
        (p1 === 'rock' && p2 === 'scissors') ||
        (p1 === 'paper' && p2 === 'rock') ||
        (p1 === 'scissors' && p2 === 'paper')
    ) {
        return 'p1'
    }
    return 'p2'
}

export function Game() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const betAmount = parseInt(searchParams.get('bet') || '0') as BetTier

    const [phase, setPhase] = useState<GamePhase>('matchmaking')
    const [matchId, setMatchId] = useState<string | null>(null)
    const [timeLeft, setTimeLeft] = useState(MATCHMAKING_TIMEOUT)
    const [myChoice, setMyChoice] = useState<Choice>(null)
    const [opponentChoice, setOpponentChoice] = useState<Choice>(null)
    const [opponentName, setOpponentName] = useState<string>('Opponent')
    const [isBot, setIsBot] = useState(false)
    const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null)
    const [earnings, setEarnings] = useState(0)
    const [showBotPrompt, setShowBotPrompt] = useState(false)

    // Validate bet amount
    useEffect(() => {
        if (!betAmount || !zimBetAccount || zimBetAccount.balance < betAmount) {
            navigate('/dashboard')
        }
    }, [betAmount, zimBetAccount, navigate])

    // Matchmaking phase
    useEffect(() => {
        if (phase !== 'matchmaking') return

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    // No opponent found, prompt for bot
                    setShowBotPrompt(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        // Try to find an opponent
        findOpponent()

        return () => clearInterval(timer)
    }, [phase])

    const findOpponent = async () => {
        if (!zimBetAccount) return

        // First, look for existing waiting matches
        const { data: waitingMatch } = await supabase
            .from('zimbet_matches')
            .select('*')
            .eq('status', 'waiting')
            .eq('bet_amount', betAmount)
            .neq('player1_id', zimBetAccount.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single()

        if (waitingMatch) {
            // Join existing match
            const { error } = await supabase
                .from('zimbet_matches')
                .update({
                    player2_id: zimBetAccount.id,
                    status: 'choosing'
                })
                .eq('id', waitingMatch.id)

            if (!error) {
                setMatchId(waitingMatch.id)
                // Get opponent name
                const { data: opponent } = await supabase
                    .from('zimbet_accounts')
                    .select('username')
                    .eq('id', waitingMatch.player1_id)
                    .single()

                if (opponent) setOpponentName(opponent.username)

                // Deduct bet from balance
                await supabase
                    .from('zimbet_accounts')
                    .update({ balance: zimBetAccount.balance - betAmount })
                    .eq('id', zimBetAccount.id)

                setPhase('choosing')
                setTimeLeft(CHOICE_TIMEOUT)
                return
            }
        }

        // Create new waiting match
        const { data: newMatch, error } = await supabase
            .from('zimbet_matches')
            .insert({
                player1_id: zimBetAccount.id,
                bet_amount: betAmount,
                status: 'waiting'
            })
            .select()
            .single()

        if (!error && newMatch) {
            setMatchId(newMatch.id)

            // Deduct bet from balance
            await supabase
                .from('zimbet_accounts')
                .update({ balance: zimBetAccount.balance - betAmount })
                .eq('id', zimBetAccount.id)

            // Subscribe to match updates
            const subscription = supabase
                .channel(`match:${newMatch.id}`)
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'zimbet_matches', filter: `id=eq.${newMatch.id}` },
                    async (payload) => {
                        const updated = payload.new as any
                        if (updated.status === 'choosing' && updated.player2_id) {
                            // Opponent joined!
                            const { data: opponent } = await supabase
                                .from('zimbet_accounts')
                                .select('username')
                                .eq('id', updated.player2_id)
                                .single()

                            if (opponent) setOpponentName(opponent.username)
                            setPhase('choosing')
                            setTimeLeft(CHOICE_TIMEOUT)
                            subscription.unsubscribe()
                        }
                    }
                )
                .subscribe()

            return () => subscription.unsubscribe()
        }
    }

    const playWithBot = async () => {
        if (!zimBetAccount) return

        setShowBotPrompt(false)
        setIsBot(true)
        setOpponentName('🤖 Bot')

        // Update match to bot match
        if (matchId) {
            await supabase
                .from('zimbet_matches')
                .update({
                    is_bot_match: true,
                    status: 'choosing'
                })
                .eq('id', matchId)
        }

        setPhase('choosing')
        setTimeLeft(CHOICE_TIMEOUT)
    }

    const cancelMatch = async () => {
        if (matchId && zimBetAccount) {
            // Cancel and refund
            await supabase
                .from('zimbet_matches')
                .update({ status: 'cancelled' })
                .eq('id', matchId)

            // Refund bet
            await supabase
                .from('zimbet_accounts')
                .update({ balance: zimBetAccount.balance + betAmount })
                .eq('id', zimBetAccount.id)
        }
        navigate('/dashboard')
    }

    // Choosing phase timer
    useEffect(() => {
        if (phase !== 'choosing') return

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    // Auto-select random if no choice
                    if (!myChoice) {
                        const randomChoice = CHOICES[Math.floor(Math.random() * 3)]
                        handleChoice(randomChoice)
                    }
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [phase, myChoice])

    const handleChoice = async (choice: Choice) => {
        if (!choice || myChoice) return
        setMyChoice(choice)

        if (isBot) {
            // Bot game - immediate resolution
            const botChoice = getBotChoice()
            setOpponentChoice(botChoice)

            setTimeout(() => {
                resolveGame(choice, botChoice)
            }, 1500)
        } else if (matchId) {
            // PvP - update database
            const isPlayer1 = true // Simplification - would need to check actual player

            await supabase
                .from('zimbet_matches')
                .update({
                    [isPlayer1 ? 'player1_choice' : 'player2_choice']: choice
                })
                .eq('id', matchId)

            // Check if opponent has chosen
            // In real implementation, would use realtime subscription
            setTimeout(() => {
                // For prototype, simulate opponent choice
                const oppChoice = getBotChoice()
                setOpponentChoice(oppChoice)
                resolveGame(choice, oppChoice)
            }, 2000)
        }
    }

    const resolveGame = async (my: Choice, opp: Choice) => {
        setPhase('revealing')

        setTimeout(async () => {
            const winner = getWinner(my, opp)

            if (winner === 'p1') {
                setResult('win')
                const winnings = betAmount * 2 * (1 - HOUSE_FEE_PERCENT / 100)
                setEarnings(winnings)

                // Update account
                if (zimBetAccount) {
                    await supabase
                        .from('zimbet_accounts')
                        .update({
                            balance: zimBetAccount.balance + winnings,
                            total_wins: (zimBetAccount.total_wins || 0) + 1,
                            total_earnings: (zimBetAccount.total_earnings || 0) + winnings - betAmount
                        })
                        .eq('id', zimBetAccount.id)
                }
            } else if (winner === 'p2') {
                setResult('lose')
                setEarnings(-betAmount)

                if (zimBetAccount) {
                    await supabase
                        .from('zimbet_accounts')
                        .update({
                            total_losses: (zimBetAccount.total_losses || 0) + 1,
                            total_earnings: (zimBetAccount.total_earnings || 0) - betAmount
                        })
                        .eq('id', zimBetAccount.id)
                }
            } else {
                setResult('draw')
                setEarnings(0)

                // Refund on draw
                if (zimBetAccount) {
                    await supabase
                        .from('zimbet_accounts')
                        .update({ balance: zimBetAccount.balance + betAmount })
                        .eq('id', zimBetAccount.id)
                }
            }

            // Update match status
            if (matchId) {
                await supabase
                    .from('zimbet_matches')
                    .update({ status: 'completed' })
                    .eq('id', matchId)
            }

            setPhase('result')
            refreshAccount()
        }, 1500)
    }

    const playAgain = () => {
        navigate(`/game?bet=${betAmount}`)
        window.location.reload()
    }

    return (
        <div className="game-page">
            {/* Header */}
            <header className="game-header">
                <button className="back-btn" onClick={cancelMatch}>
                    ← Exit
                </button>
                <div className="bet-info">
                    <span className="bet-label">Bet:</span>
                    <span className="bet-value">${betAmount}</span>
                </div>
            </header>

            {/* Matchmaking Phase */}
            {phase === 'matchmaking' && !showBotPrompt && (
                <div className="game-content matchmaking">
                    <div className="search-animation">
                        <div className="search-ring"></div>
                        <span className="search-icon">🔍</span>
                    </div>
                    <h2>Finding Opponent...</h2>
                    <p className="timer">{timeLeft}s</p>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${(timeLeft / MATCHMAKING_TIMEOUT) * 100}%` }}
                        ></div>
                    </div>
                    <button className="btn-cancel" onClick={cancelMatch}>
                        Cancel & Refund
                    </button>
                </div>
            )}

            {/* Bot Prompt */}
            {showBotPrompt && (
                <div className="game-content bot-prompt">
                    <span className="prompt-icon">🤖</span>
                    <h2>No Players Available</h2>
                    <p>Would you like to play against the bot?</p>
                    <div className="prompt-buttons">
                        <button className="btn-primary" onClick={playWithBot}>
                            Play vs Bot
                        </button>
                        <button className="btn-secondary" onClick={cancelMatch}>
                            Cancel & Refund
                        </button>
                    </div>
                </div>
            )}

            {/* Choosing Phase */}
            {phase === 'choosing' && (
                <div className="game-content choosing">
                    <div className="opponent-info">
                        <span className="opponent-avatar">
                            {isBot ? '🤖' : opponentName.charAt(0).toUpperCase()}
                        </span>
                        <span className="opponent-name">vs {opponentName}</span>
                    </div>

                    <div className="timer-section">
                        <p>Make your choice!</p>
                        <div className={`countdown ${timeLeft <= 3 ? 'urgent' : ''}`}>
                            {timeLeft}s
                        </div>
                    </div>

                    <div className="choices">
                        {CHOICES.map((choice) => (
                            <button
                                key={choice}
                                className={`choice-btn ${myChoice === choice ? 'selected' : ''} ${myChoice && myChoice !== choice ? 'disabled' : ''}`}
                                onClick={() => handleChoice(choice)}
                                disabled={!!myChoice}
                            >
                                <span className="choice-emoji">{CHOICE_EMOJIS[choice]}</span>
                                <span className="choice-label">{choice}</span>
                            </button>
                        ))}
                    </div>

                    {myChoice && (
                        <p className="waiting-text">Waiting for opponent...</p>
                    )}
                </div>
            )}

            {/* Revealing Phase */}
            {phase === 'revealing' && (
                <div className="game-content revealing">
                    <h2>Revealing...</h2>
                    <div className="reveal-area">
                        <div className="reveal-card you">
                            <span className="reveal-emoji">{myChoice ? CHOICE_EMOJIS[myChoice] : '❓'}</span>
                            <span className="reveal-label">You</span>
                        </div>
                        <span className="vs">VS</span>
                        <div className="reveal-card opponent">
                            <span className="reveal-emoji">{opponentChoice ? CHOICE_EMOJIS[opponentChoice] : '❓'}</span>
                            <span className="reveal-label">{opponentName}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Phase */}
            {phase === 'result' && (
                <div className={`game-content result ${result}`}>
                    <div className="result-icon">
                        {result === 'win' && '🏆'}
                        {result === 'lose' && '😢'}
                        {result === 'draw' && '🤝'}
                    </div>
                    <h2 className="result-text">
                        {result === 'win' && 'You Won!'}
                        {result === 'lose' && 'You Lost'}
                        {result === 'draw' && 'It\'s a Draw!'}
                    </h2>

                    <div className="reveal-area">
                        <div className="reveal-card you">
                            <span className="reveal-emoji">{myChoice ? CHOICE_EMOJIS[myChoice] : '❓'}</span>
                            <span className="reveal-label">You</span>
                        </div>
                        <span className="vs">VS</span>
                        <div className="reveal-card opponent">
                            <span className="reveal-emoji">{opponentChoice ? CHOICE_EMOJIS[opponentChoice] : '❓'}</span>
                            <span className="reveal-label">{opponentName}</span>
                        </div>
                    </div>

                    <div className={`earnings ${result}`}>
                        {result === 'win' && `+$${earnings.toFixed(2)}`}
                        {result === 'lose' && `-$${betAmount}`}
                        {result === 'draw' && 'Bet Refunded'}
                    </div>

                    <div className="result-actions">
                        <button className="btn-primary" onClick={playAgain}>
                            Play Again ($${betAmount})
                        </button>
                        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
                            Back to Lobby
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
