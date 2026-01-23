import { useEffect, useState } from 'react'
import './Confetti.css'

interface ConfettiProps {
    trigger: boolean
    duration?: number
}

interface Particle {
    id: number
    x: number
    y: number
    color: string
    size: number
    rotation: number
    delay: number
}

export function Confetti({ trigger, duration = 3000 }: ConfettiProps) {
    const [particles, setParticles] = useState<Particle[]>([])
    const [isActive, setIsActive] = useState(false)

    const colors = [
        '#ffd700', // Gold
        '#ff6b6b', // Red
        '#4ecdc4', // Teal
        '#45b7d1', // Blue
        '#f7dc6f', // Yellow
        '#bb8fce', // Purple
        '#82e0aa', // Green
        '#f8b500', // Orange
    ]

    useEffect(() => {
        if (trigger && !isActive) {
            setIsActive(true)

            // Generate particles
            const newParticles: Particle[] = []
            for (let i = 0; i < 100; i++) {
                newParticles.push({
                    id: i,
                    x: Math.random() * 100,
                    y: -10 - Math.random() * 20,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: 6 + Math.random() * 8,
                    rotation: Math.random() * 360,
                    delay: Math.random() * 0.5
                })
            }
            setParticles(newParticles)

            // Clear after duration
            setTimeout(() => {
                setIsActive(false)
                setParticles([])
            }, duration)
        }
    }, [trigger, isActive, duration])

    if (!isActive) return null

    return (
        <div className="confetti-container">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="confetti-particle"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        backgroundColor: p.color,
                        width: `${p.size}px`,
                        height: `${p.size * 0.6}px`,
                        transform: `rotate(${p.rotation}deg)`,
                        animationDelay: `${p.delay}s`
                    }}
                />
            ))}
        </div>
    )
}
