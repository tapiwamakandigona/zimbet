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

// ========== CRYPTO SECURE RNG ==========
// Replaces insecure Math.random()
export function secureRandom(): number {
    const array = new Uint32Array(1)
    window.crypto.getRandomValues(array)
    // Convert 32-bit integer to 0-1 float
    return array[0] / (0xffffffff + 1)
}

// Generate a random string for seeds
export function generateSeed(length = 32): string {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

// Simple hash function for client-side verifying (SHA-256 would be async)
// For client-side demo, we use a robust synchronous hash or just rely on secureRandom
// Real implementation would use: crypto.subtle.digest('SHA-256', ...)

// ========== MONEY FORMATTING ==========
// All money should be whole dollars, no cents, no commas
export function formatMoney(amount: number): string {
    const whole = Math.floor(Math.abs(amount))
    const sign = amount < 0 ? '-' : ''
    return `${sign}$${whole}`
}

// Ensure amount is at least $1 and whole
export function validateBetAmount(amount: number, balance: number): number {
    const whole = Math.floor(amount)
    return Math.max(1, Math.min(whole, Math.floor(balance)))
}

// ========== AVIATOR ==========
// Aviator crash point calculation
// Uses exponential distribution to favor low crash points
export function generateAviatorCrashPoint(): number {
    // Formula: crashPoint = 0.99 / (1 - random)
    // This creates an exponential distribution
    const random = secureRandom()
    // Prevent division by zero and extreme values
    const safeRandom = Math.max(0.01, Math.min(0.99, random))
    const crashPoint = 0.99 / (1 - safeRandom)
    // Cap at 100x for display purposes
    return Math.min(100, Math.round(crashPoint * 100) / 100)
}

// ========== DICE ==========
// Dice game multiplier calculation
// Lower win chance = higher payout
export function calculateDiceMultiplier(winChance: number): number {
    // Formula: (100 / winChance) * RTP
    // Example: 50% chance = (100/50) * 0.99 = 1.98x
    return Math.round((100 / winChance) * GAME_RTP.dice * 100) / 100
}

// Dice roll result (1-100)
export function rollDice(): number {
    // Use secure random for the roll
    return Math.floor(secureRandom() * 100) + 1
}

// ========== COINFLIP ==========
// Coinflip: simple 50/50
export function flipCoin(): 'heads' | 'tails' {
    return secureRandom() < 0.5 ? 'heads' : 'tails'
}

// ========== MINES ==========
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

// Generate mines grid - Legacy Random (for back-compat or simple games)
export function generateMinesGrid(gridSize: number, minesCount: number): boolean[] {
    const grid: boolean[] = new Array(gridSize).fill(false)
    let placed = 0
    while (placed < minesCount) {
        const pos = Math.floor(secureRandom() * gridSize)
        if (!grid[pos]) {
            grid[pos] = true
            placed++
        }
    }
    return grid
}

// ========== DETERMINISTIC (PROVABLY FAIR) MINES ==========

// Seeded RNG: Cyrb128 (Same as Aviator Engine)
function cyrb128(str: string) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return function () {
        h1 = Math.imul(h1 ^ h2 ^ h3 ^ h4, 2095160);
        h2 = Math.imul(h2 ^ h1, 10661418);
        return (h1 >>> 0) / 4294967296;
    }
}

// Fisher-Yates shuffle with seeded RNG
function shuffleSeeded<T>(array: T[], seed: string): T[] {
    const rng = cyrb128(seed)
    const newArr = [...array]
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        const temp = newArr[i]
        newArr[i] = newArr[j]
        newArr[j] = temp
    }
    return newArr
}

// Get mine positions for a specific seed/nonce
// Returns indices of mines
export function getDeterministicMineIndices(seed: string, nonce: number, gridSize: number, minesCount: number): number[] {
    const combinedSeed = `${seed}-${nonce}`
    // Create base array [0, 1, ..., 24]
    const indices = Array.from({ length: gridSize }, (_, i) => i)
    // Shuffle
    const shuffled = shuffleSeeded(indices, combinedSeed)
    // Take first N
    return shuffled.slice(0, minesCount)
}

// Verify if a tile is a mine (without needing full grid in state)
export function isMine(seed: string, nonce: number, gridSize: number, minesCount: number, tileIndex: number): boolean {
    const mineIndices = getDeterministicMineIndices(seed, nonce, gridSize, minesCount)
    return mineIndices.includes(tileIndex)
}

// ========== WHEEL OF FORTUNE ==========
// Wheel segments with WHOLE NUMBER multipliers only
export const WHEEL_SEGMENTS = [
    { multiplier: 0, probability: 0.20, color: '#dc2626', label: '0x' },
    { multiplier: 1, probability: 0.30, color: '#7c3aed', label: '1x' },
    { multiplier: 2, probability: 0.25, color: '#2563eb', label: '2x' },
    { multiplier: 3, probability: 0.12, color: '#0891b2', label: '3x' },
    { multiplier: 5, probability: 0.08, color: '#059669', label: '5x' },
    { multiplier: 10, probability: 0.04, color: '#d97706', label: '10x' },
    { multiplier: 20, probability: 0.01, color: '#eab308', label: '20x' }
] as const

// Spin wheel and get result
export function spinWheel(): typeof WHEEL_SEGMENTS[number] {
    const rand = secureRandom()
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
        return messages[Math.floor(secureRandom() * messages.length)]
    }
    return ''
}
