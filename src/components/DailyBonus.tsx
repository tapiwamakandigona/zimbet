import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './DailyBonus.css'

const DAILY_BONUS_AMOUNT = 10
const STORAGE_KEY = 'zimbet_last_daily_claim'

export function DailyBonus() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const [claiming, setClaiming] = useState(false)
    const [claimState, setClaimState] = useState<'loading' | 'available' | 'claimed' | 'already_claimed'>('loading')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!zimBetAccount) return

        // Check localStorage for last claim (fallback since DB column may not exist)
        const storedClaim = localStorage.getItem(STORAGE_KEY)
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

        // Also check database field if it exists
        const dbClaim = zimBetAccount.last_daily_claim
        const lastClaimTime = storedClaim ? parseInt(storedClaim, 10) :
            dbClaim ? new Date(dbClaim).getTime() : 0

        if (lastClaimTime >= todayStart) {
            setClaimState('already_claimed')
        } else {
            setClaimState('available')
        }
    }, [zimBetAccount])

    if (!zimBetAccount) return null
    if (claimState === 'loading') return null
    if (claimState === 'already_claimed') return null

    const handleClaim = async () => {
        if (claiming) return

        setClaiming(true)
        setError(null)

        try {
            // Update balance in database
            const { error: updateError } = await supabase
                .from('zimbet_accounts')
                .update({ balance: zimBetAccount.balance + DAILY_BONUS_AMOUNT })
                .eq('id', zimBetAccount.id)

            if (updateError) {
                throw new Error('Failed to update balance')
            }

            // Store claim time in localStorage (reliable fallback)
            localStorage.setItem(STORAGE_KEY, Date.now().toString())

            // Try to update DB field too (may fail if column doesn't exist, that's ok)
            try {
                await supabase
                    .from('zimbet_accounts')
                    .update({ last_daily_claim: new Date().toISOString() })
                    .eq('id', zimBetAccount.id)
            } catch {
                // Column may not exist, that's fine - localStorage is our fallback
            }

            setClaimState('claimed')
            await refreshAccount()

            // Auto-hide success after 4 seconds
            setTimeout(() => setClaimState('already_claimed'), 4000)
        } catch (e) {
            console.error('Failed to claim daily bonus:', e)
            setError('Failed to claim bonus. Try again!')
            setClaiming(false)
        }
    }

    if (claimState === 'claimed') {
        return (
            <div className="daily-bonus claimed">
                <div className="db-icon">🎉</div>
                <div className="db-content">
                    <div className="db-title">Bonus Claimed!</div>
                    <div className="db-amount">+${DAILY_BONUS_AMOUNT}</div>
                </div>
            </div>
        )
    }

    return (
        <div className="daily-bonus">
            <div className="db-icon">🎁</div>
            <div className="db-content">
                <div className="db-title">Daily Bonus Available!</div>
                <div className="db-subtitle">Claim your free ${DAILY_BONUS_AMOUNT} today</div>
                {error && <div className="db-error">{error}</div>}
            </div>
            <button className="db-btn" onClick={handleClaim} disabled={claiming}>
                {claiming ? 'Claiming...' : 'Claim'}
            </button>
        </div>
    )
}
