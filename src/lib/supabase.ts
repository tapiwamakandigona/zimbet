import { createClient } from '@supabase/supabase-js'

// Same Supabase project as ZimPay
const supabaseUrl = 'https://ilhwoebtxxkudihfgmub.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHdvZWJ0eHhrdWRpaGZnbXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDQ3ODIsImV4cCI6MjA4MjYyMDc4Mn0.gHgoACn3MS-Y2Yy4I_cdh5sKuuV7hRikyVmm6OfP8zM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'zimbet-auth',
        flowType: 'pkce'
    }
})

// ZimBet specific types
export type ZimBetAccount = {
    id: string
    user_id: string
    username: string
    balance: number
    total_wins: number
    total_losses: number
    total_earnings: number
    last_daily_claim: string | null
    created_at: string
}

export type ZimBetMatch = {
    id: string
    player1_id: string
    player2_id: string | null
    bet_amount: number
    player1_choice: 'rock' | 'paper' | 'scissors' | null
    player2_choice: 'rock' | 'paper' | 'scissors' | null
    winner_id: string | null
    is_bot_match: boolean
    status: 'waiting' | 'matched' | 'choosing' | 'completed' | 'cancelled'
    created_at: string
    expires_at: string
}

export type LeaderboardEntry = {
    username: string
    total_wins: number
    total_losses: number
    total_earnings: number
    win_rate: number
}

// Casino Game Types
export type CasinoGameType = 'aviator' | 'dice' | 'coinflip' | 'mines' | 'wheel' | 'rps'

export type CasinoGameResult = {
    id: string
    user_id: string
    game_type: CasinoGameType
    bet_amount: number
    multiplier: number
    payout: number
    is_win: boolean
    game_data: Record<string, unknown> // Game-specific data (crash point, dice result, etc.)
    created_at: string
}

// Transaction types for fund transfers
export type TransactionType = 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund'

export type ZimBetTransaction = {
    id: string
    user_id: string
    type: TransactionType
    amount: number
    balance_before: number
    balance_after: number
    description: string
    created_at: string
}

// Bet tier options
export const BET_TIERS = [10, 20, 50, 100, 500] as const
export type BetTier = typeof BET_TIERS[number]

// Casino bet amounts (more flexible)
export const CASINO_BETS = [1, 5, 10, 25, 50, 100, 250, 500, 1000] as const
export type CasinoBet = typeof CASINO_BETS[number]

// Game constants
export const MATCHMAKING_TIMEOUT = 20 // seconds to find opponent
export const CHOICE_TIMEOUT = 10 // seconds to make choice
export const HOUSE_FEE_PERCENT = 10 // 10% to house
export const HOUSE_ACCOUNT = 'silentics.org' // House account username
