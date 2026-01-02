import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase, CASINO_BETS } from '../../lib/supabase'
import { generateMinesGrid, calculateMinesMultiplier, getRandomMessage, createSession, updateSession, formatMoney } from '../../lib/gameEngine'
import type { GameSession } from '../../lib/gameEngine'
import './Mines.css'

const GRID_SIZE = 25 // 5x5

type TileState = 'hidden' | 'gem' | 'mine'

export function Mines() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const navigate = useNavigate()

    const [betAmount, setBetAmount] = useState<number>(10)
    const [minesCount, setMinesCount] = useState<number>(5)
    const [gameActive, setGameActive] = useState(false)
    const [tiles, setTiles] = useState<TileState[]>(new Array(GRID_SIZE).fill('hidden'))
    const [minePositions, setMinePositions] = useState<boolean[]>([])
    const [revealedCount, setRevealedCount] = useState(0)
    const [gameOver, setGameOver] = useState(false)
    const [hitMine, setHitMine] = useState(false)
    const [message, setMessage] = useState('')
    const [session, setSession] = useState<GameSession>(createSession())

    const currentMultiplier = useMemo(() => {
        if (revealedCount === 0) return 1.00
        return calculateMinesMultiplier(GRID_SIZE, minesCount, revealedCount)
    }, [revealedCount, minesCount])

    const nextMultiplier = useMemo(() => {
        return calculateMinesMultiplier(GRID_SIZE, minesCount, revealedCount + 1)
    }, [revealedCount, minesCount])

    const potentialWin = betAmount * currentMultiplier

    const startGame = async () => {
        if (!zimBetAccount || betAmount > zimBetAccount.balance) {
            setMessage('Insufficient balance!')
            return
        }

        // Deduct bet
        await supabase
            .from('zimbet_accounts')
            .update({ balance: zimBetAccount.balance - betAmount })
            .eq('id', zimBetAccount.id)

        // Generate mine positions
        const mines = generateMinesGrid(GRID_SIZE, minesCount)
        setMinePositions(mines)
        setTiles(new Array(GRID_SIZE).fill('hidden'))
        setRevealedCount(0)
        setGameActive(true)
        setGameOver(false)
        setHitMine(false)
        setMessage('')
        refreshAccount()
    }

    const revealTile = (index: number) => {
        if (!gameActive || tiles[index] !== 'hidden' || gameOver) return

        const newTiles = [...tiles]

        if (minePositions[index]) {
            // Hit mine - game over
            newTiles[index] = 'mine'
            // Reveal all mines
            minePositions.forEach((isMine, i) => {
                if (isMine) newTiles[i] = 'mine'
            })
            setTiles(newTiles)
            setHitMine(true)
            setGameOver(true)
            setGameActive(false)
            setMessage(getRandomMessage('lose'))
            setSession(updateSession(session, betAmount, 0, false))
        } else {
            // Safe tile - gem found
            newTiles[index] = 'gem'
            setTiles(newTiles)
            setRevealedCount(prev => prev + 1)
        }
    }

    const cashout = async () => {
        if (!gameActive || revealedCount === 0) return

        const winnings = potentialWin

        // Add winnings
        if (zimBetAccount) {
            await supabase
                .from('zimbet_accounts')
                .update({
                    balance: zimBetAccount.balance + winnings,
                    total_wins: zimBetAccount.total_wins + 1,
                    total_earnings: zimBetAccount.total_earnings + (winnings - betAmount)
                })
                .eq('id', zimBetAccount.id)
        }

        // Reveal all mines
        const newTiles = [...tiles]
        minePositions.forEach((isMine, i) => {
            if (isMine && tiles[i] === 'hidden') newTiles[i] = 'mine'
        })
        setTiles(newTiles)

        setGameOver(true)
        setGameActive(false)
        setMessage(currentMultiplier >= 5 ? getRandomMessage('bigWin') : getRandomMessage('win'))
        setSession(updateSession(session, betAmount, winnings, true))
        refreshAccount()
    }

    const resetGame = () => {
        setTiles(new Array(GRID_SIZE).fill('hidden'))
        setMinePositions([])
        setRevealedCount(0)
        setGameActive(false)
        setGameOver(false)
        setHitMine(false)
        setMessage('')
    }

    return (
        <div className="mines-page">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
                    ← Back
                </button>
                <div className="game-title">
                    <span className="game-icon">💎</span>
                    <span>Mines</span>
                </div>
                <div className="balance">
                    {formatMoney(zimBetAccount?.balance || 0)}
                </div>
            </header>

            {/* Multiplier Display */}
            {gameActive && !gameOver && (
                <div className="multiplier-bar">
                    <div className="current-mult">
                        <span className="mult-label">Current</span>
                        <span className="mult-value">{currentMultiplier.toFixed(2)}x</span>
                        <span className="mult-cash">${potentialWin.toFixed(2)}</span>
                    </div>
                    <div className="next-mult">
                        <span className="mult-label">Next</span>
                        <span className="mult-value">{nextMultiplier.toFixed(2)}x</span>
                    </div>
                </div>
            )}

            {/* Game Grid */}
            <div className="game-area">
                <div className={`mines-grid ${gameActive ? 'active' : ''}`}>
                    {tiles.map((tile, index) => (
                        <button
                            key={index}
                            className={`tile ${tile}`}
                            onClick={() => revealTile(index)}
                            disabled={!gameActive || tile !== 'hidden'}
                        >
                            {tile === 'gem' && '💎'}
                            {tile === 'mine' && '💣'}
                        </button>
                    ))}
                </div>

                {/* Result Overlay */}
                {gameOver && (
                    <div className={`result-overlay ${hitMine ? 'lose' : 'win'}`}>
                        <span className="result-icon">{hitMine ? '💥' : '🎉'}</span>
                        <span className="result-text">
                            {hitMine ? 'BOOM!' : `+$${(potentialWin - betAmount).toFixed(2)}`}
                        </span>
                        {message && <span className="result-message">{message}</span>}
                    </div>
                )}
            </div>

            <div className="controls">
                {!gameActive ? (
                    <>
                        {/* Mines Selection */}
                        <div className="mines-section">
                            <label>Mines: {minesCount}</label>
                            <div className="mines-buttons">
                                {[1, 3, 5, 10, 15, 20].map(count => (
                                    <button
                                        key={count}
                                        className={minesCount === count ? 'active' : ''}
                                        onClick={() => setMinesCount(count)}
                                    >
                                        {count}
                                    </button>
                                ))}
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
                                        disabled={amt > (zimBetAccount?.balance || 0)}
                                    >
                                        ${amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            className="play-btn"
                            onClick={startGame}
                            disabled={betAmount <= 0 || betAmount > (zimBetAccount?.balance || 0)}
                        >
                            Start Game - ${betAmount}
                        </button>
                    </>
                ) : gameOver ? (
                    <button className="play-btn" onClick={resetGame}>
                        Play Again
                    </button>
                ) : (
                    <button
                        className="cashout-btn"
                        onClick={cashout}
                        disabled={revealedCount === 0}
                    >
                        Cash Out ${potentialWin.toFixed(2)}
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
                    <span className="stat-label">Profit</span>
                    <span className={`stat-value ${session.totalWon - session.totalWagered >= 0 ? 'positive' : 'negative'}`}>
                        ${(session.totalWon - session.totalWagered).toFixed(2)}
                    </span>
                </div>
                <div className="stat">
                    <span className="stat-label">Biggest Win</span>
                    <span className="stat-value">${session.biggestWin.toFixed(2)}</span>
                </div>
            </div>
        </div>
    )
}
