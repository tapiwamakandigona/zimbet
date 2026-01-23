import { generateSeed } from './gameEngine'

export interface AviatorState {
    roundId: string
    phase: 'waiting' | 'flying' | 'crashed'
    crashPoint: number
    startTime: number // When this round started/starts
    duration: number // Total duration of this round
    now: number
}

// ========== PROVABLY FAIR SIMULATION ==========
// In a real app, Server Seed is secret on server, Client Seed is public.
// Here we simulate this by holding a "Server Seed" in memory for the session.
// This ensures that even if you know the time, you can't predict the result without the seed.

let SERVER_SEED = generateSeed()
let CLIENT_SEED = 'client-seed-demo' // In a real app, user can change this
let NONCE = 0

// Allow UI to interact with Fairness
export function setClientSeed(seed: string) {
    CLIENT_SEED = seed
    // Reset round to apply new seed immediately?
    // Usually applies to NEXT round.
}

export function getClientSeed() {
    return CLIENT_SEED
}

// In real app, we verify SHA256(SERVER_SEED) matches this
// For now, return the seed itself (simulated "Reveal" after round)
// or the hashed version if we had a toggle.
// Let's just return the raw seed for this demo so user can copy-paste to hash checker.
export function getServerSeed() {
    return SERVER_SEED
}

// Robust seeded RNG (Cyrb128) - better than mulberry32
// We need this because we must be able to RE-GENERATE the same crash point
// given the same seeds (for verification).
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

    // Return a function that generates next random
    return function () {
        h1 = Math.imul(h1 ^ h2 ^ h3 ^ h4, 2095160); // Mix 1
        h2 = Math.imul(h2 ^ h1, 10661418);         // Mix 2
        return (h1 >>> 0) / 4294967296;
    }
}

// Generate crash point using Provably Fair seeds
function generateProvablyFairCrash(serverSeed: string, clientSeed: string, nonce: number): number {
    // Combine seeds to create a unique hash/seed for this round
    const combined = `${serverSeed}-${clientSeed}-${nonce}`

    // Use the combined string to seed our RNG
    const rng = cyrb128(combined)
    const random = rng() // Get uniform float 0-1

    // Apply Aviator Crash Formula
    // 0.99 / (1 - random) = exponential distribution
    // 1% House Edge is standard (or 3-4% for some variants)
    // GAME_RTP.aviator is 0.97, so let's align.
    // If we want 97% RTP, the crash point should roughly be 0.97 / (1-r) maybe?
    // Actually standard is: crash = 0.99 / (1-r) but "Instant bust" logic handles the edge.
    // Let's stick to the classic formula which feels "right" for gameplay.

    const safeRandom = Math.max(0.01, Math.min(0.99, random))
    const crashPoint = 0.99 / (1 - safeRandom)

    // 1 in ~100 games should be instant crash (1.00x) for house edge
    // The formula naturally produces logic: if random < 0.01 (1%), crash < 1.0 -> clamp to 1.0

    return Math.min(100, Math.round(Math.max(1, crashPoint) * 100) / 100)
}

// Calculate flight duration in ms
function getFlightDuration(multiplier: number): number {
    if (multiplier <= 1.0) return 0
    // formula: multiplier = E^(elapsed_sec * 0.12)  => elapsed_sec = ln(mult) / 0.12
    return (Math.log(multiplier) / 0.12) * 1000
}

const WAITING_TIME_MS = 5000

// State Management
let currentRound: AviatorState | null = null

export function getCurrentRound(now = Date.now()): AviatorState {
    // If no round or current round totally finished (including post-crash delay), start next
    // logic: if (!currentRound) -> init
    // if (currentRound) -> check if time > startTime + duration -> init next

    if (!currentRound) {
        initNextRound(now)
    }

    // Check if we need to progress to next round
    // We add a small buffer so the loop catches the 'crashed' state properly before switching
    if (currentRound && now > (currentRound.startTime + currentRound.duration + 100)) {
        initNextRound(now)
    }

    // Should be initialized now
    const r = currentRound!
    const elapsed = now - r.startTime

    let phase: 'waiting' | 'flying' | 'crashed' = 'waiting'

    if (elapsed < WAITING_TIME_MS) {
        phase = 'waiting'
    } else {
        const flightTime = elapsed - WAITING_TIME_MS
        const crashTime = getFlightDuration(r.crashPoint)

        if (flightTime < crashTime) {
            phase = 'flying'
        } else {
            phase = 'crashed'
        }
    }

    return { ...r, phase, now }
}

function initNextRound(now: number) {
    NONCE++
    const crash = generateProvablyFairCrash(SERVER_SEED, CLIENT_SEED, NONCE)
    const flight = getFlightDuration(crash)
    const duration = WAITING_TIME_MS + flight + 3000 // 3s post-crash delay

    // Start time should be "now" if we are starting fresh,
    // or "end of last round" if we want seamlessness.
    // Ideally "now" to avoid catch-up glitches if tab was inactive.
    const startTime = now

    currentRound = {
        roundId: `${SERVER_SEED.substring(0, 5)}-${NONCE}`,
        phase: 'waiting',
        crashPoint: crash,
        startTime: startTime,
        duration: duration,
        now: now
    }
}

// Generate deterministic fake bets
export function getFakeBets(roundId: string) {
    // Hash roundId to get seed for bot behavior
    const rng = cyrb128(roundId)

    const FAKE_USERS = ['User123', 'AviatorKing', 'LuckyGirl', 'Speedy', 'PilotToMoon', 'CrashMaster', 'ZeroRisk', 'BigWinner', 'CryptoFan', 'ZimChamp']
    const bets = []
    const count = 5 + Math.floor(rng() * 10)

    for (let i = 0; i < count; i++) {
        bets.push({
            user: FAKE_USERS[Math.floor(rng() * FAKE_USERS.length)],
            amount: Math.floor(rng() * 500) + 10,
            cashoutPoint: 1 + (rng() * rng() * 10),
        })
    }
    return bets.sort((a, b) => b.amount - a.amount)
}

// Get history of last N rounds
// Since we are simulating "live", we can't just peek into future/past easily without storing them
// For now, we'll maintain a runtime history or generate "past" by reversing nonce
export function getRoundHistory(count: number = 10): number[] {
    const history: number[] = []
    // Look back from current nonce - 1
    let tempNonce = NONCE - 1

    for (let i = 0; i < count; i++) {
        if (tempNonce < 1) break // Start of world
        const crash = generateProvablyFairCrash(SERVER_SEED, CLIENT_SEED, tempNonce)
        history.push(crash)
        tempNonce--
    }

    return history
}
