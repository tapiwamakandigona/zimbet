import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './DailyBonus.css'

const DAILY_BONUS_AMOUNT = 10

export function DailyBonus() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const [claiming, setClaiming] = useState(false)
    const [justClaimed, setJustClaimed] = useState(false)

    if (!zimBetAccount) return null

    // Check if eligible for daily bonus
    const lastClaim = zimBetAccount.last_daily_claim
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    const canClaim = !lastClaim || new Date(lastClaim).getTime() < todayStart

    if (!canClaim && !justClaimed) return null

    const handleClaim = async () => {
        if (!canClaim || claiming) return

        setClaiming(true)

        try {
            const { error } = await supabase
                .from('zimbet_accounts')
                .update({
                    balance: zimBetAccount.balance + DAILY_BONUS_AMOUNT,
                    last_daily_claim: new Date().toISOString()
                })
                .eq('id', zimBetAccount.id)

            if (!error) {
                setJustClaimed(true)
                await refreshAccount()

                // Auto-hide after 3 seconds
                setTimeout(() => setJustClaimed(false), 3000)
            }
        } catch (e) {
            console.error('Failed to claim daily bonus:', e)
        } finally {
            setClaiming(false)
        }
    }

    return (
        <div className={`daily-bonus ${justClaimed ? 'claimed' : ''}`}>
            {justClaimed ? (
                <>
                    <div className="db-icon">🎉</div>
                    <div className="db-content">
                        <div className="db-title">Claimed!</div>
                        <div className="db-amount">+${DAILY_BONUS_AMOUNT}</div>
                    </div>
                </>
            ) : (
                <>
                    <div className="db-icon">🎁</div>
                    <div className="db-content">
                        <div className="db-title">Daily Bonus Available!</div>
                        <div className="db-subtitle">Claim your free ${DAILY_BONUS_AMOUNT}</div>
                    </div>
                    <button className="db-btn" onClick={handleClaim} disabled={claiming}>
                        {claiming ? '...' : 'Claim'}
                    </button>
                </>
            )}
        </div>
    )
}
