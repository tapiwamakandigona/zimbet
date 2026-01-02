import { useState } from 'react'
import './ProvablyFair.css'

interface ProvablyFairProps {
    onClose: () => void
    gameData?: {
        seed?: string
        serverSeed?: string
        nonce?: number
        result?: string
    }
}

export function ProvablyFair({ onClose, gameData }: ProvablyFairProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'verify'>('overview')

    return (
        <div className="pf-overlay" onClick={onClose}>
            <div className="pf-modal" onClick={e => e.stopPropagation()}>
                <button className="pf-close" onClick={onClose}>✕</button>

                <div className="pf-header">
                    <div className="pf-icon">🔐</div>
                    <h2>Provably Fair</h2>
                    <p>Your trust is our priority</p>
                </div>

                <div className="pf-tabs">
                    <button
                        className={activeTab === 'overview' ? 'active' : ''}
                        onClick={() => setActiveTab('overview')}
                    >
                        How It Works
                    </button>
                    <button
                        className={activeTab === 'verify' ? 'active' : ''}
                        onClick={() => setActiveTab('verify')}
                    >
                        Verify Result
                    </button>
                </div>

                {activeTab === 'overview' && (
                    <div className="pf-content">
                        <div className="pf-step">
                            <div className="pf-step-num">1</div>
                            <div className="pf-step-info">
                                <h4>Server Seed (Hidden)</h4>
                                <p>Before each round, we generate a secret seed that determines the outcome. This is hashed and shown to you BEFORE the game.</p>
                            </div>
                        </div>
                        <div className="pf-step">
                            <div className="pf-step-num">2</div>
                            <div className="pf-step-info">
                                <h4>Your Client Seed</h4>
                                <p>You can set your own seed that gets combined with ours. This ensures we can't predict or manipulate the result.</p>
                            </div>
                        </div>
                        <div className="pf-step">
                            <div className="pf-step-num">3</div>
                            <div className="pf-step-info">
                                <h4>Verification</h4>
                                <p>After each game, we reveal the server seed. You can verify the hash matches and recalculate the result yourself.</p>
                            </div>
                        </div>

                        <div className="pf-guarantee">
                            <span className="pf-check">✓</span>
                            <span>Every game outcome is mathematically verifiable</span>
                        </div>
                    </div>
                )}

                {activeTab === 'verify' && (
                    <div className="pf-content">
                        {gameData?.seed ? (
                            <div className="pf-data">
                                <div className="pf-field">
                                    <label>Server Seed Hash</label>
                                    <input readOnly value={gameData.serverSeed || 'Revealed after game'} />
                                </div>
                                <div className="pf-field">
                                    <label>Client Seed</label>
                                    <input readOnly value={gameData.seed} />
                                </div>
                                <div className="pf-field">
                                    <label>Nonce</label>
                                    <input readOnly value={gameData.nonce?.toString() || '0'} />
                                </div>
                                <div className="pf-field">
                                    <label>Result</label>
                                    <input readOnly value={gameData.result || 'Pending...'} />
                                </div>
                            </div>
                        ) : (
                            <div className="pf-empty">
                                <p>Play a game to see verification data here.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
