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

        const amount = Math.floor(withdrawAmount)
        if (amount < 1) return setMessage({ type: 'error', text: 'Min withdrawal $1' })
        if (amount > zimBetAccount.balance) return setMessage({ type: 'error', text: 'Insufficient balance' })
        if (!zimpayUsername) return setMessage({ type: 'error', text: 'Username required' })

        setLoading(true)
        setMessage(null)

        try {
            const cleanUser = zimpayUsername.replace('@', '').trim()
            if (cleanUser.toLowerCase().startsWith('zm-')) throw new Error('Cannot withdraw to ZimBet')

            const { data: recipient, error: searchError } = await supabase
                .from('profiles')
                .select('id, balance')
                .eq('username', cleanUser)
                .single()

            if (searchError || !recipient) throw new Error('User not found')

            // Deduct
            const { error: deductErr } = await supabase
                .from('zimbet_accounts')
                .update({ balance: Math.floor(zimBetAccount.balance - amount) })
                .eq('id', zimBetAccount.id)
            if (deductErr) throw deductErr

            // Add
            const { error: addErr } = await supabase
                .from('profiles')
                .update({ balance: Math.floor(recipient.balance + amount) })
                .eq('id', recipient.id)

            if (addErr) {
                // Refund
                await supabase.from('zimbet_accounts').update({ balance: zimBetAccount.balance }).eq('id', zimBetAccount.id)
                throw addErr
            }

            // Record
            await supabase.from('transactions').insert({
                sender_id: zimBetAccount.user_id,
                receiver_id: recipient.id,
                amount: amount,
                description: `ZimBet withdrawal`,
                status: 'completed'
            })

            setMessage({ type: 'success', text: `Sent ${formatMoney(amount)} to @${cleanUser}` })
            await refreshAccount()
            setWithdrawAmount(10)
            setZimpayUsername('')
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Error processing withdrawal' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="wallet-container">
            {/* VIRTUAL CARD */}
            <div className="virtual-card">
                <div className="card-chip"></div>
                <div className="card-logo">ZIMBET</div>
                <div className="card-balance-label">Total Balance</div>
                <div className="card-balance">{formatMoney(zimBetAccount?.balance || 0)}</div>
                <div className="card-footer">
                    <div className="card-holder">
                        <span>CARD HOLDER</span>
                        <div className="holder-name">@{zimBetAccount?.username.replace(/^zm-/i, '')}</div>
                    </div>
                    <div className="card-brand">PLATINUM</div>
                </div>
            </div>

            {/* ACTION TABS */}
            <div className="wallet-actions-tabs">
                <button
                    className={`action-tab ${activeTab === 'deposit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('deposit')}
                >
                    <span>⬇️</span> Deposit
                </button>
                <button
                    className={`action-tab ${activeTab === 'withdraw' ? 'active' : ''}`}
                    onClick={() => setActiveTab('withdraw')}
                >
                    <span>⬆️</span> Withdraw
                </button>
            </div>

            {message && (
                <div className={`wallet-alert ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* CONTENT AREA */}
            <div className="action-content">
                {activeTab === 'deposit' ? (
                    <div className="deposit-view">
                        <h3>Instant Deposit via ZimPay</h3>
                        <div className="instruction-step">
                            <div className="step-badge">1</div>
                            <p>Open <b>ZimPay</b> App</p>
                        </div>
                        <div className="instruction-step">
                            <div className="step-badge">2</div>
                            <p>Send to: <b className="highlight-user">@{zimBetAccount?.username}</b></p>
                        </div>
                        <div className="instruction-step">
                            <div className="step-badge">3</div>
                            <p>Funds appear instantly!</p>
                        </div>

                        <a href="https://tapiwamakandigona.github.io/zimpay" target="_blank" className="zimpay-link-btn">
                            Launch ZimPay
                        </a>
                        <button className="refresh-link" onClick={refreshAccount}>Check Balance</button>
                    </div>
                ) : (
                    <div className="withdraw-view">
                        <h3>Cash Out to ZimPay</h3>
                        <div className="input-group">
                            <label>To Username</label>
                            <input
                                value={zimpayUsername}
                                onChange={e => setZimpayUsername(e.target.value)}
                                placeholder="@username"
                            />
                        </div>
                        <div className="input-group">
                            <label>Amount ($)</label>
                            <input
                                type="number"
                                value={withdrawAmount}
                                onChange={e => setWithdrawAmount(Number(e.target.value))}
                            />
                        </div>
                        <div className="quick-chips">
                            {[10, 50, 100, 500].map(n => (
                                <button key={n} onClick={() => setWithdrawAmount(n)}>${n}</button>
                            ))}
                        </div>
                        <button
                            className="primary-action-btn"
                            disabled={loading}
                            onClick={handleWithdraw}
                        >
                            {loading ? 'Processing...' : 'CONFIRM WITHDRAWAL'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
