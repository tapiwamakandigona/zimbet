import { useEffect, useState } from 'react'
import './BigWin.css'

interface BigWinProps {
    amount: number
    multiplier?: number
    onComplete: () => void
}

export function BigWin({ amount, multiplier, onComplete }: BigWinProps) {
    const [animatedAmount, setAnimatedAmount] = useState(0)
    const [phase, setPhase] = useState<'enter' | 'count' | 'exit'>('enter')

    useEffect(() => {
        // Enter animation
        setTimeout(() => setPhase('count'), 500)

        // Count up animation
        const duration = 2000
        const steps = 60
        const increment = amount / steps
        let current = 0

        const timer = setInterval(() => {
            current += increment
            if (current >= amount) {
                setAnimatedAmount(amount)
                clearInterval(timer)
                // Exit after showing final amount
                setTimeout(() => {
                    setPhase('exit')
                    setTimeout(onComplete, 500)
                }, 2000)
            } else {
                setAnimatedAmount(Math.floor(current))
            }
        }, duration / steps)

        return () => clearInterval(timer)
    }, [amount, onComplete])

    return (
        <div className={`bigwin-overlay ${phase}`}>
            <div className="bigwin-content">
                <div className="bigwin-rays"></div>
                <div className="bigwin-particles">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="bigwin-particle" style={{
                            '--delay': `${Math.random() * 2}s`,
                            '--x': `${Math.random() * 200 - 100}px`,
                            '--rotate': `${Math.random() * 360}deg`
                        } as React.CSSProperties} />
                    ))}
                </div>

                <div className="bigwin-badge">🏆 BIG WIN 🏆</div>

                <div className="bigwin-amount">
                    ${animatedAmount.toLocaleString()}
                </div>

                {multiplier && multiplier > 1 && (
                    <div className="bigwin-multiplier">
                        {multiplier.toFixed(2)}x
                    </div>
                )}

                <div className="bigwin-coins">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="bigwin-coin" style={{
                            '--delay': `${i * 0.1}s`,
                            '--x': `${(i - 6) * 30}px`
                        } as React.CSSProperties}>💰</div>
                    ))}
                </div>
            </div>
        </div>
    )
}
