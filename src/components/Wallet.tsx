import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, CASINO_BETS } from '../lib/supabase'
import './Wallet.css'

interface WalletProps {
    onClose?: () => void
}

export function Wallet({ onClose }: WalletProps) {
    const { zimBetAccount, user, refreshAccount } = useAuth()
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit')
    const [amount, setAmount] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleDeposit = async () => {
        if (!zimBetAccount || !user || amount <= 0) {
            setMessage({ type: 'error', text: 'Invalid deposit amount' })
            return
        }

        setLoading(true)
        setMessage(null)

        try {
            // For now, we directly add to ZimBet balance
            // In production, this would call ZimPay API to deduct from ZimPay balance
            const { error } = await supabase
                .from('zimbet_accounts')
                .update({ balance: zimBetAccount.balance + amount })
                .eq('id', zimBetAccount.id)

            if (error) throw error

            setMessage({ type: 'success', text: `Successfully deposited $${amount.toFixed(2)}!` })
            setAmount(0)
            refreshAccount()
        } catch (err) {
            console.error('Deposit error:', err)
            setMessage({ type: 'error', text: 'Deposit failed. Please try again.' })
        }

        setLoading(false)
    }

    const handleWithdraw = async () => {
        if (!zimBetAccount || !user || amount <= 0) {
            setMessage({ type: 'error', text: 'Invalid withdrawal amount' })
            return
        }

        if (amount > zimBetAccount.balance) {
            setMessage({ type: 'error', text: 'Insufficient balance' })
            return
        }

        setLoading(true)
        setMessage(null)

        try {
            // Deduct from ZimBet balance
            // In production, this would also call ZimPay API to add to ZimPay balance
            const { error } = await supabase
                .from('zimbet_accounts')
                .update({ balance: zimBetAccount.balance - amount })
                .eq('id', zimBetAccount.id)

            if (error) throw error

            setMessage({ type: 'success', text: `Successfully withdrew $${amount.toFixed(2)} to ZimPay!` })
            setAmount(0)
            refreshAccount()
        } catch (err) {
            console.error('Withdrawal error:', err)
            setMessage({ type: 'error', text: 'Withdrawal failed. Please try again.' })
        }

        setLoading(false)
    }

    const quickAmounts = CASINO_BETS.filter(a => a <= (zimBetAccount?.balance || 0) + 100)

    return (
        <div className="wallet-container">
            <div className="wallet-header">
                <h2>💰 Wallet</h2>
                {onClose && (
                    <button className="close-btn" onClick={onClose}>✕</button>
                )}
            </div>

            {/* Balance Display */}
            <div className="balance-card">
                <span className="balance-label">ZimBet Balance</span>
                <span className="balance-amount">${zimBetAccount?.balance.toFixed(2) || '0.00'}</span>
            </div>

            {/* Tab Navigation */}
            <div className="wallet-tabs">
                <button
                    className={`tab ${activeTab === 'deposit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('deposit')}
                >
                    📥 Deposit
                </button>
                <button
                    className={`tab ${activeTab === 'withdraw' ? 'active' : ''}`}
                    onClick={() => setActiveTab('withdraw')}
                >
                    📤 Withdraw
                </button>
                <button
                    className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📋 History
                </button>
            </div>

            {/* Message Display */}
            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Deposit Tab */}
            {activeTab === 'deposit' && (
                <div className="wallet-content">
                    <p className="description">
                        Transfer funds from your ZimPay account to ZimBet
                    </p>

                    <div className="amount-input-group">
                        <span className="currency">$</span>
                        <input
                            type="number"
                            value={amount || ''}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            placeholder="0.00"
                            min="1"
                        />
                    </div>

                    <div className="quick-amounts">
                        {quickAmounts.slice(0, 6).map((amt) => (
                            <button
                                key={amt}
                                className="quick-btn"
                                onClick={() => setAmount(amt)}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>

                    <button
                        className="action-btn deposit-btn"
                        onClick={handleDeposit}
                        disabled={loading || amount <= 0}
                    >
                        {loading ? 'Processing...' : `Deposit $${amount || 0}`}
                    </button>

                    <p className="note">
                        💡 Funds are transferred instantly from your linked ZimPay account
                    </p>
                </div>
            )}

            {/* Withdraw Tab */}
            {activeTab === 'withdraw' && (
                <div className="wallet-content">
                    <p className="description">
                        Transfer winnings back to your ZimPay account
                    </p>

                    <div className="amount-input-group">
                        <span className="currency">$</span>
                        <input
                            type="number"
                            value={amount || ''}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            placeholder="0.00"
                            min="1"
                            max={zimBetAccount?.balance || 0}
                        />
                    </div>

                    <div className="quick-amounts">
                        <button
                            className="quick-btn max"
                            onClick={() => setAmount(zimBetAccount?.balance || 0)}
                        >
                            MAX
                        </button>
                        <button
                            className="quick-btn"
                            onClick={() => setAmount((zimBetAccount?.balance || 0) / 2)}
                        >
                            50%
                        </button>
                        <button
                            className="quick-btn"
                            onClick={() => setAmount((zimBetAccount?.balance || 0) / 4)}
                        >
                            25%
                        </button>
                    </div>

                    <button
                        className="action-btn withdraw-btn"
                        onClick={handleWithdraw}
                        disabled={loading || amount <= 0 || amount > (zimBetAccount?.balance || 0)}
                    >
                        {loading ? 'Processing...' : `Withdraw $${amount || 0}`}
                    </button>

                    <p className="note">
                        💡 Withdrawals are processed instantly to your ZimPay account
                    </p>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="wallet-content history">
                    <p className="description">
                        Recent transaction history
                    </p>

                    <div className="history-list">
                        <div className="history-item">
                            <span className="history-icon">🎮</span>
                            <div className="history-details">
                                <span className="history-type">Account Created</span>
                                <span className="history-date">Welcome bonus</span>
                            </div>
                            <span className="history-amount positive">+$100.00</span>
                        </div>

                        <p className="empty-state">
                            Play some games to see your transaction history here!
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
