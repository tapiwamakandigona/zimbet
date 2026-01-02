export interface AviatorState {
    roundId: string
    phase: 'waiting' | 'flying' | 'crashed'
    crashPoint: number
    startTime: number // When this round started/starts
    duration: number // Total duration of this round
    now: number
}

// Simple seeded RNG
function mulberry32(a: number) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Generate crash point (same physics as before)
// 0.99 / (1 - random)
function getCrashPoint(random: number): number {
    const safeRandom = Math.max(0.01, Math.min(0.99, random))
    const crashPoint = 0.99 / (1 - safeRandom)
    return Math.min(100, Math.round(crashPoint * 100) / 100)
}

// Calculate flight duration in ms for a given multiplier
// Using the formula from Aviator.tsx: multiplier = E^(elapsed * 0.12)
// elapsed = ln(multiplier) / 0.12
// elapsed_ms = (ln(multiplier) / 0.12) * 1000
function getFlightDuration(multiplier: number): number {
    if (multiplier <= 1.0) return 0
    return (Math.log(multiplier) / 0.12) * 1000
}

const WAITING_TIME_MS = 5000 // 5 seconds waiting

// Cache for generated rounds per hour to avoid recalculating
// Key: "YYYY-MM-DD-HH"
const scheduleCache: Record<string, AviatorState[]> = {}

function generateHourlySchedule(timestamp: number): AviatorState[] {
    const date = new Date(timestamp)
    date.setMinutes(0, 0, 0)
    const hourStart = date.getTime()
    const seedStr = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}-${date.getUTCHours()}`

    // Create numeric seed from string
    let seed = 0
    for (let i = 0; i < seedStr.length; i++) seed = (seed << 5) - seed + seedStr.charCodeAt(i)

    const rng = mulberry32(seed)

    if (scheduleCache[seedStr]) return scheduleCache[seedStr]

    const rounds: AviatorState[] = []
    let currentTime = hourStart
    // Generate enough rounds to cover the hour + overlap
    // A safe upper bound is 3600 / 5 = 720 rounds (if all instant crash)
    // Realistically 400 is plenty

    for (let i = 0; i < 500; i++) {
        const r1 = rng() // for crash point
        // const r2 = rng() // spare

        const crash = getCrashPoint(r1)
        const flightTime = getFlightDuration(crash)
        const totalDuration = WAITING_TIME_MS + flightTime + 3000 // +3s post-crash delay

        rounds.push({
            roundId: `${seedStr}-${i}`,
            phase: 'waiting', // default, calculated dynamically later
            crashPoint: crash,
            startTime: currentTime,
            duration: totalDuration,
            now: 0
        })

        currentTime += totalDuration
    }

    scheduleCache[seedStr] = rounds
    return rounds
}

export function getCurrentRound(now = Date.now()): AviatorState {
    const rounds = generateHourlySchedule(now)

    // Find the round that contains 'now'
    // Since rounds are sorted by startTime, we can find the first one where startTime + duration > now

    let activeRound = rounds.find(r => r.startTime <= now && (r.startTime + r.duration) > now)

    if (!activeRound) {
        // Fallback (shouldn't happen unless clock skew > 1 hour or gap in logic)
        // Just return the last one (crashed) or first of next hour?
        // Let's return a dummy waiting round
        return {
            roundId: 'fallback',
            phase: 'waiting',
            crashPoint: 1.0,
            startTime: now,
            duration: 10000,
            now
        }
    }

    const elapsed = now - activeRound.startTime

    // Determine phase
    let phase: 'waiting' | 'flying' | 'crashed' = 'waiting'

    if (elapsed < WAITING_TIME_MS) {
        phase = 'waiting'
    } else {
        const flightTime = elapsed - WAITING_TIME_MS
        const crashTime = getFlightDuration(activeRound.crashPoint)

        if (flightTime < crashTime) {
            phase = 'flying'
        } else {
            phase = 'crashed'
        }
    }

    return {
        ...activeRound,
        phase,
        now
    }
}

// Generate deterministic fake bets for a round
export function getFakeBets(roundId: string) {
    // Hash roundId to get seed
    let seed = 0
    for (let i = 0; i < roundId.length; i++) seed = (seed << 5) - seed + roundId.charCodeAt(i)
    const rng = mulberry32(seed)

    const FAKE_USERS = ['User123', 'AviatorKing', 'LuckyGirl', 'Speedy', 'PilotToMoon', 'CrashMaster', 'ZeroRisk', 'BigWinner', 'CryptoFan', 'ZimChamp']

    const bets = []
    const count = 5 + Math.floor(rng() * 10) // 5-15 fake users

    for (let i = 0; i < count; i++) {
        bets.push({
            user: FAKE_USERS[Math.floor(rng() * FAKE_USERS.length)],
            amount: Math.floor(rng() * 500) + 10,
            cashoutPoint: 1 + (rng() * rng() * 10), // Bias towards low cashouts
        })
    }

    return bets.sort((a, b) => b.amount - a.amount)
}

export function getRoundHistory(count: number = 10): number[] {
    const now = Date.now()
    let rounds = generateHourlySchedule(now)
    let activeIndex = rounds.findIndex(r => r.startTime <= now && (r.startTime + r.duration) > now)

    // If active round found, we want rounds BEFORE it.
    // If no active round (active simulation gap or end of list), find where we are
    if (activeIndex === -1) {
        // If we are past the last round of this hour batch (unlikely with 500 rounds), check logic.
        // Or if we are before first round?
        // Fallback: use all rounds that have ended
        const endedRounds = rounds.filter(r => (r.startTime + r.duration) < now)
        activeIndex = endedRounds.length
    }

    // Collect history
    let history: number[] = []

    // Safety for beginning of hour
    if (activeIndex < count) {
        // Need previous hour
        const prevHourRounds = generateHourlySchedule(now - 3600 * 1000)
        // Take from end of prev hour
        history = prevHourRounds.slice(-(count - activeIndex)).map(r => r.crashPoint)
    }

    // Add from current hour
    // We want rounds from [activeIndex - needed] to [activeIndex]
    const needed = count - history.length
    const fromCurrent = rounds.slice(activeIndex - needed, activeIndex).map(r => r.crashPoint)
    history = [...history, ...fromCurrent]

    // Ensure we have exactly count (trim if needed or return whatever we found)
    return history
}
