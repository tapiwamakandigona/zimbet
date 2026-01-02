// House Edge and Game Mathematics Utilities

// Different games have different RTPs (Return to Player)
export const GAME_RTP = {
    aviator: 0.97,    // 97% RTP, 3% house edge
    dice: 0.99,       // 99% RTP, 1% house edge  
    coinflip: 0.975,  // 97.5% RTP, 2.5% house edge
    mines: 0.98,      // 98% RTP, 2% house edge
    wheel: 0.95,      // 95% RTP, 5% house edge
    rps: 0.90         // 90% RTP (existing Rock Paper Scissors)
} as const

export type GameType = keyof typeof GAME_RTP

// Aviator crash point calculation
// Uses exponential distribution to favor low crash points
export function generateAviatorCrashPoint(): number {
    // Formula: crashPoint = 0.99 / (1 - random)
    // This creates an exponential distribution
    const random = Math.random()
    // Prevent division by zero and extreme values
    const safeRandom = Math.max(0.01, Math.min(0.99, random))
    const crashPoint = 0.99 / (1 - safeRandom)
    // Cap at 100x for display purposes
    return Math.min(100, Math.round(crashPoint * 100) / 100)
}

// Dice game multiplier calculation
// Lower win chance = higher payout
export function calculateDiceMultiplier(winChance: number): number {
    // Formula: (100 / winChance) * RTP
    // Example: 50% chance = (100/50) * 0.99 = 1.98x
    return Math.round((100 / winChance) * GAME_RTP.dice * 100) / 100
}

// Dice roll result (1-100)
export function rollDice(): number {
    return Math.floor(Math.random() * 100) + 1
}

// Coinflip: simple 50/50
export function flipCoin(): 'heads' | 'tails' {
    return Math.random() < 0.5 ? 'heads' : 'tails'
}

// Mines: calculate multiplier based on revealed tiles
export function calculateMinesMultiplier(
    totalTiles: number,
    minesCount: number,
    revealedCount: number
): number {
    // Probability of hitting a safe tile decreases with each reveal
    // Multiplier = 1 / cumulative_probability * RTP
    let probability = 1
    let safeTiles = totalTiles - minesCount

    for (let i = 0; i < revealedCount; i++) {
        probability *= (safeTiles - i) / (totalTiles - i)
    }

    const multiplier = (1 / probability) * GAME_RTP.mines
    return Math.round(multiplier * 100) / 100
}

// Generate mines grid
export function generateMinesGrid(gridSize: number, minesCount: number): boolean[] {
    const grid: boolean[] = new Array(gridSize).fill(false)
    let placed = 0

    while (placed < minesCount) {
        const pos = Math.floor(Math.random() * gridSize)
        if (!grid[pos]) {
            grid[pos] = true
            placed++
        }
    }

    return grid
}

// Wheel segments with probabilities
export const WHEEL_SEGMENTS = [
    { multiplier: 0, probability: 0.15, color: '#e74c3c', label: '0x' },
    { multiplier: 0.5, probability: 0.20, color: '#c0392b', label: '0.5x' },
    { multiplier: 1, probability: 0.25, color: '#9b59b6', label: '1x' },
    { multiplier: 1.5, probability: 0.15, color: '#8e44ad', label: '1.5x' },
    { multiplier: 2, probability: 0.12, color: '#3498db', label: '2x' },
    { multiplier: 3, probability: 0.07, color: '#2980b9', label: '3x' },
    { multiplier: 5, probability: 0.04, color: '#27ae60', label: '5x' },
    { multiplier: 10, probability: 0.02, color: '#f1c40f', label: '10x' }
] as const

// Spin wheel and get result
export function spinWheel(): typeof WHEEL_SEGMENTS[number] {
    const rand = Math.random()
    let accumulated = 0

    for (const segment of WHEEL_SEGMENTS) {
        accumulated += segment.probability
        if (rand <= accumulated) {
            return segment
        }
    }

    // Fallback to first segment
    return WHEEL_SEGMENTS[0]
}

// Addictive Features: Near Miss Detection
export function isNearMiss(result: number, target: number, threshold: number = 0.1): boolean {
    const distance = Math.abs(result - target)
    const range = Math.max(target, 100 - target)
    return distance / range < threshold
}

// Session tracking for addictive hooks
export interface GameSession {
    gamesPlayed: number
    totalWagered: number
    totalWon: number
    biggestWin: number
    currentStreak: number
    maxStreak: number
}

export function createSession(): GameSession {
    return {
        gamesPlayed: 0,
        totalWagered: 0,
        totalWon: 0,
        biggestWin: 0,
        currentStreak: 0,
        maxStreak: 0
    }
}

export function updateSession(
    session: GameSession,
    wager: number,
    won: number,
    isWin: boolean
): GameSession {
    return {
        gamesPlayed: session.gamesPlayed + 1,
        totalWagered: session.totalWagered + wager,
        totalWon: session.totalWon + won,
        biggestWin: Math.max(session.biggestWin, won),
        currentStreak: isWin ? session.currentStreak + 1 : 0,
        maxStreak: isWin ? Math.max(session.maxStreak, session.currentStreak + 1) : session.maxStreak
    }
}

// Encouraging messages for different situations
export const MESSAGES = {
    bigWin: [
        "🤑 HUGE WIN!",
        "💰 JACKPOT!",
        "🔥 MASSIVE!",
        "💎 LEGENDARY!",
        "🚀 TO THE MOON!"
    ],
    win: [
        "💰 Nice win!",
        "✨ Winner!",
        "🎯 Got it!",
        "💵 Profit!",
        "👑 Champion!"
    ],
    nearMiss: [
        "😮 SO CLOSE!",
        "💫 Almost had it!",
        "🎲 One more try!",
        "⚡ Next one's yours!",
        "🔥 You're warming up!"
    ],
    lose: [
        "🎲 Try again!",
        "💪 Next time!",
        "🔄 One more spin!",
        "📈 Luck's turning!",
        "🌟 Stay in the game!"
    ],
    streak: (count: number) => `🔥 ${count} WIN STREAK!`
}

export function getRandomMessage(type: keyof typeof MESSAGES): string {
    const messages = MESSAGES[type]
    if (Array.isArray(messages)) {
        return messages[Math.floor(Math.random() * messages.length)]
    }
    return ''
}
