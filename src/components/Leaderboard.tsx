import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ZimBetAccount } from '../lib/supabase'
import './Leaderboard.css'

type LeaderboardType = 'wins' | 'earnings' | 'winrate'

type LeaderboardEntry = ZimBetAccount & {
    rank: number
    win_rate: number
}

export function Leaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState<LeaderboardType>('wins')

    useEffect(() => {
        fetchLeaderboard()
    }, [sortBy])

    const fetchLeaderboard = async () => {
        setLoading(true)

        let query = supabase
            .from('zimbet_accounts')
            .select('*')
            .limit(50)

        // Sort based on selected type
        if (sortBy === 'wins') {
            query = query.order('total_wins', { ascending: false })
        } else if (sortBy === 'earnings') {
            query = query.order('total_earnings', { ascending: false })
        } else {
            // Win rate - we'll calculate and sort client-side
            query = query.order('total_wins', { ascending: false })
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching leaderboard:', error)
            setLoading(false)
            return
        }

        // Calculate win rate and add rank
        let ranked = (data || []).map((entry, index) => {
            const totalGames = (entry.total_wins || 0) + (entry.total_losses || 0)
            const winRate = totalGames > 0
                ? ((entry.total_wins || 0) / totalGames) * 100
                : 0

            return {
                ...entry,
                rank: index + 1,
                win_rate: winRate
            }
        })

        // Re-sort by win rate if needed
        if (sortBy === 'winrate') {
            ranked = ranked
                .filter(e => (e.total_wins || 0) + (e.total_losses || 0) >= 5) // Min 5 games
                .sort((a, b) => b.win_rate - a.win_rate)
                .map((entry, index) => ({ ...entry, rank: index + 1 }))
        }

        setEntries(ranked)
        setLoading(false)
    }

    const formatCurrency = (amount: number) => {
        const isNegative = amount < 0
        return `${isNegative ? '-' : '+'}$${Math.abs(amount).toFixed(2)}`
    }

    return (
        <div className="leaderboard">
            {/* Sort Tabs */}
            <div className="sort-tabs">
                <button
                    className={`sort-tab ${sortBy === 'wins' ? 'active' : ''}`}
                    onClick={() => setSortBy('wins')}
                >
                    🏆 Most Wins
                </button>
                <button
                    className={`sort-tab ${sortBy === 'earnings' ? 'active' : ''}`}
                    onClick={() => setSortBy('earnings')}
                >
                    💰 Earnings
                </button>
                <button
                    className={`sort-tab ${sortBy === 'winrate' ? 'active' : ''}`}
                    onClick={() => setSortBy('winrate')}
                >
                    📊 Win Rate
                </button>
            </div>

            {/* Leaderboard List */}
            {loading ? (
                <div className="leaderboard-loading">
                    <div className="spinner"></div>
                    <p>Loading leaderboard...</p>
                </div>
            ) : entries.length === 0 ? (
                <div className="leaderboard-empty">
                    <span className="empty-icon">🏆</span>
                    <p>No players yet. Be the first!</p>
                </div>
            ) : (
                <div className="leaderboard-list">
                    {entries.map((entry) => (
                        <div
                            key={entry.id}
                            className={`leaderboard-item ${entry.rank <= 3 ? `top-${entry.rank}` : ''}`}
                        >
                            <div className="rank">
                                {entry.rank === 1 && '🥇'}
                                {entry.rank === 2 && '🥈'}
                                {entry.rank === 3 && '🥉'}
                                {entry.rank > 3 && `#${entry.rank}`}
                            </div>
                            <div className="player-info">
                                <span className="player-avatar">
                                    {entry.username.charAt(0).toUpperCase()}
                                </span>
                                <span className="player-name">@{entry.username}</span>
                            </div>
                            <div className="player-stats">
                                {sortBy === 'wins' && (
                                    <span className="stat-value wins">{entry.total_wins} W</span>
                                )}
                                {sortBy === 'earnings' && (
                                    <span className={`stat-value ${entry.total_earnings >= 0 ? 'positive' : 'negative'}`}>
                                        {formatCurrency(entry.total_earnings)}
                                    </span>
                                )}
                                {sortBy === 'winrate' && (
                                    <span className="stat-value winrate">{entry.win_rate.toFixed(1)}%</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
