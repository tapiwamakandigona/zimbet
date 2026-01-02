import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatMoney } from '../lib/gameEngine'
import './Wallet.css'

type Tab = 'deposit' | 'withdraw'

export function Wallet() {
    const { zimBetAccount, refreshAccount } = useAuth()
    const [activeTab, setActiveTab] = useState<Tab>('deposit')
    const [withdrawAmount, setWithdrawAmount] = useState<number>(10)
    const [zimpayUsername, setZimpayUsername] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const handleWithdraw = async () => {
        if (!zimBetAccount) return

        // Validate
        const amount = Math.floor(withdrawAmount)
        if (amount < 1) {
            setMessage({ type: 'error', text: 'Minimum withdrawal is $1' })
            return
        }
        if (amount > zimBetAccount.balance) {
            setMessage({ type: 'error', text: 'Insufficient balance' })
            return
        }
        if (!zimpayUsername.trim()) {
            setMessage({ type: 'error', text: 'Enter your ZimPay username' })
            return
        }

        // Remove @ prefix if present
        const cleanUsername = zimpayUsername.replace('@', '').trim()

        // Block zimbet usernames
        if (cleanUsername.toLowerCase().startsWith('zm-')) {
            setMessage({ type: 'error', text: 'Cannot withdraw to ZimBet accounts' })
            return
        }

        setLoading(true)
        setMessage(null)

        try {
            // 1. Check if ZimPay username exists
            const { data: recipientProfile, error: searchError } = await supabase
                .from('profiles')
                .select('id, username, balance')
                .eq('username', cleanUsername)
                .single()

            if (searchError || !recipientProfile) {
                setMessage({ type: 'error', text: `ZimPay user "@${cleanUsername}" not found` })
                setLoading(false)
                return
            }

            // 2. Deduct from ZimBet balance
            const { error: deductError } = await supabase
                .from('zimbet_accounts')
                .update({ balance: Math.floor(zimBetAccount.balance - amount) })
                .eq('id', zimBetAccount.id)

            if (deductError) {
                setMessage({ type: 'error', text: 'Withdrawal failed. Try again.' })
                setLoading(false)
                return
            }

            // 3. Add to ZimPay balance
            const { error: addError } = await supabase
                .from('profiles')
                .update({ balance: Math.floor(recipientProfile.balance + amount) })
                .eq('id', recipientProfile.id)

            if (addError) {
                // Rollback ZimBet deduction
                await supabase
                    .from('zimbet_accounts')
                    .update({ balance: zimBetAccount.balance })
                    .eq('id', zimBetAccount.id)

                setMessage({ type: 'error', text: 'Transfer failed. Balance restored.' })
                setLoading(false)
                return
            }

            // 4. Record transaction in ZimPay's transactions table
            await supabase
                .from('transactions')
                .insert({
                    sender_id: zimBetAccount.user_id,
                    receiver_id: recipientProfile.id,
                    amount: amount,
                    description: `ZimBet withdrawal to @${cleanUsername}`,
                    status: 'completed'
                })

            setMessage({ type: 'success', text: `${formatMoney(amount)} sent to @${cleanUsername}!` })
            setWithdrawAmount(10)
            setZimpayUsername('')
            refreshAccount()

        } catch {
            setMessage({ type: 'error', text: 'Something went wrong. Try again.' })
        }

        setLoading(false)
    }

    return (
        <div className="wallet">
            {/* Balance Display */}
            <div className="wallet-balance">
                <span className="balance-label">ZimBet Balance</span>
                <span className="balance-amount">
                    {formatMoney(zimBetAccount?.balance || 0)}
                </span>
            </div>

            {/* Tabs */}
            <div className="wallet-tabs">
                <button
                    className={activeTab === 'deposit' ? 'active' : ''}
                    onClick={() => { setActiveTab('deposit'); setMessage(null); }}
                >
                    Deposit
                </button>
                <button
                    className={activeTab === 'withdraw' ? 'active' : ''}
                    onClick={() => { setActiveTab('withdraw'); setMessage(null); }}
                >
                    Withdraw
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`wallet-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Deposit Tab */}
            {activeTab === 'deposit' && (
                <div className="wallet-section">
                    <h3>Add Funds from ZimPay</h3>

                    <div className="instructions">
                        <div className="step">
                            <span className="step-num">1</span>
                            <span>Open ZimPay and go to Send Money</span>
                        </div>
                        <div className="step">
                            <span className="step-num">2</span>
                            <span>Send to username: <strong>@{zimBetAccount?.username}</strong></span>
                        </div>
                        <div className="step">
                            <span className="step-num">3</span>
                            <span>Your ZimBet balance updates automatically</span>
                        </div>
                    </div>

                    <a
                        href="https://tapiwamakandigona.github.io/zimpay/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="zimpay-btn"
                    >
                        Open ZimPay →
                    </a>

                    <button className="refresh-btn" onClick={refreshAccount}>
                        ↻ Refresh Balance
                    </button>
                </div>
            )}

            {/* Withdraw Tab */}
            {activeTab === 'withdraw' && (
                <div className="wallet-section">
                    <h3>Withdraw to ZimPay</h3>

                    <div className="form-group">
                        <label>ZimPay Username</label>
                        <input
                            type="text"
                            value={zimpayUsername}
                            onChange={(e) => setZimpayUsername(e.target.value)}
                            placeholder="@username"
                        />
                    </div>

                    <div className="form-group">
                        <label>Amount</label>
                        <div className="amount-input">
                            <span className="currency">$</span>
                            <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(Math.floor(Number(e.target.value)))}
                                min={1}
                                max={zimBetAccount?.balance || 0}
                            />
                        </div>
                    </div>

                    <div className="quick-amounts">
                        {[10, 25, 50, 100, 500].map(amt => (
                            <button
                                key={amt}
                                onClick={() => setWithdrawAmount(amt)}
                                className={withdrawAmount === amt ? 'active' : ''}
                                disabled={amt > (zimBetAccount?.balance || 0)}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>

                    <button
                        className="withdraw-btn"
                        onClick={handleWithdraw}
                        disabled={loading || withdrawAmount < 1}
                    >
                        {loading ? 'Processing...' : `Withdraw ${formatMoney(withdrawAmount)}`}
                    </button>
                </div>
            )}
        </div>
    )
}
