// Advanced Hybrid Audio Manager
// Prioritizes "Real Audio" (MP3/WAV) from /sounds/ directory.
// Falls back to "Pro-Procedural" Synthesis if files are missing.

let audioCtx: AudioContext | null = null
let gainNode: GainNode | null = null

function getContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        audioCtx = new AudioContext()
        gainNode = audioCtx.createGain()
        gainNode.connect(audioCtx.destination)

        // Restore mute state
        const isMuted = localStorage.getItem('zimbet_muted') === 'true'
        gainNode.gain.value = isMuted ? 0 : 0.6
    }
    return { audioCtx, gainNode }
}

let isMuted = localStorage.getItem('zimbet_muted') === 'true'

// File-based assets (Place these in public/sounds/)
// Mapped to realistic casino sounds
const ASSETS: Record<string, HTMLAudioElement> = {
    click: new Audio('/sounds/click.mp3'),           // Mechanical switch
    hover: new Audio('/sounds/hover.mp3'),           // Soft air whoosh
    win: new Audio('/sounds/win.mp3'),               // Cash register + Chime
    loss: new Audio('/sounds/loss.mp3'),             // Thud or error tone
    spin: new Audio('/sounds/spin.mp3'),             // Card shuffle / Wheel whir
    crash: new Audio('/sounds/crash.mp3'),           // Glass break / Explosion
    coin: new Audio('/sounds/coin.mp3'),             // Metal chip clink
    jackpot: new Audio('/sounds/jackpot.mp3')        // Orchestral hit
}

// Preload (silent fail if missing)
Object.values(ASSETS).forEach(audio => {
    audio.volume = 0.5
    audio.load()
})

// --- PRO SYNTHESIS ENGINE (Backup) ---

// Helper: Play a sound, prefer file, fallback to synth
async function playSound(name: keyof typeof ASSETS, synthFn: (ctx: AudioContext, dest: AudioNode) => void) {
    const { audioCtx, gainNode } = getContext()

    if (audioCtx.state === 'suspended') await audioCtx.resume()
    if (isMuted) return

    // 1. Try playing Real Audio File
    const audio = ASSETS[name]
    if (audio) {
        try {
            audio.currentTime = 0
            // If the file loads successfully, play it
            // We use a promise to detect if it actually plays or fails (e.g. 404)
            await audio.play()
            return // If successful, skip synth
        } catch (e) {
            // File missing or blocked -> Fallback to Synth
        }
    }

    // 2. Fallback to Synth (Procedural)
    synthFn(audioCtx, gainNode!)
}

// 1. SuperSaw (Rich, thick sound for wins)
function playSuperSaw(freq: number, duration: number, time: number, ctx: AudioContext, dest: AudioNode) {
    const osc1 = ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = freq
    const osc2 = ctx.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = freq * 1.01 // Detune
    const osc3 = ctx.createOscillator(); osc3.type = 'sawtooth'; osc3.frequency.value = freq * 0.99 // Detune

    const env = ctx.createGain()
    env.gain.setValueAtTime(0.1, time)
    env.gain.exponentialRampToValueAtTime(0.01, time + duration)

    osc1.connect(env); osc2.connect(env); osc3.connect(env)
    env.connect(dest)

    osc1.start(time); osc2.start(time); osc3.start(time)
    osc1.stop(time + duration); osc2.stop(time + duration); osc3.stop(time + duration)

    setTimeout(() => {
        osc1.disconnect(); osc2.disconnect(); osc3.disconnect(); env.disconnect();
    }, duration * 1000 + 100)
}

// 2. FM Bell (Metallic, coin-like)
function playFMBell(freq: number, duration: number, time: number, ctx: AudioContext, dest: AudioNode) {
    const carrier = ctx.createOscillator()
    const modulator = ctx.createOscillator()
    const modGain = ctx.createGain()
    const masterGain = ctx.createGain()

    carrier.frequency.value = freq
    modulator.frequency.value = freq * 2.5 // Ratio for metallic
    modGain.gain.value = 1000 // Modulation depth

    modulator.connect(modGain)
    modGain.connect(carrier.frequency)
    carrier.connect(masterGain)
    masterGain.connect(dest)

    masterGain.gain.setValueAtTime(0.3, time)
    masterGain.gain.exponentialRampToValueAtTime(0.01, time + duration)

    carrier.start(time); modulator.start(time)
    carrier.stop(time + duration); modulator.stop(time + duration)

    setTimeout(() => {
        carrier.disconnect(); modulator.disconnect(); modGain.disconnect(); masterGain.disconnect();
    }, duration * 1000 + 100)
}

// 3. Crisp Click (Filtered Noise - Less Robotic)
function playCrispClick(time: number, ctx: AudioContext, dest: AudioNode) {
    const bufferSize = ctx.sampleRate * 0.05 // 50ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 2000

    const env = ctx.createGain()
    env.gain.setValueAtTime(0.3, time) // Lower volume for subtlety
    env.gain.exponentialRampToValueAtTime(0.01, time + 0.05)

    noise.connect(filter).connect(env).connect(dest)
    noise.start(time)

    setTimeout(() => {
        noise.disconnect(); filter.disconnect(); env.disconnect();
    }, 100)
}

export const soundManager = {
    toggleMute: () => {
        isMuted = !isMuted
        const { gainNode } = getContext()
        if (gainNode) gainNode.gain.value = isMuted ? 0 : 0.6
        localStorage.setItem('zimbet_muted', String(isMuted))
        return isMuted
    },
    isMuted: () => isMuted,

    playClick: () => playSound('click', (ctx, dest) => {
        playCrispClick(ctx.currentTime, ctx, dest)
    }),

    playHover: () => playSound('hover', (ctx, dest) => {
        // Less annoying hover (Tick instead of Sweep)
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(800, t)
        const env = ctx.createGain()
        env.gain.setValueAtTime(0.02, t) // Very quiet
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.01) // Super short
        osc.connect(env).connect(dest)
        osc.start(t); osc.stop(t + 0.02)
    }),

    playCoin: () => playSound('coin', (ctx, dest) => {
        playFMBell(1200, 0.3, ctx.currentTime, ctx, dest)
    }),

    // Alias Gem to Coin
    playGem: () => playSound('coin', (ctx, dest) => {
        const t = ctx.currentTime
        playFMBell(1500, 0.1, t, ctx, dest)
        playFMBell(2000, 0.2, t + 0.05, ctx, dest)
    }),

    playAction: () => playSound('spin', (ctx, dest) => {
        const t = ctx.currentTime
        // Rising futuristic swipe
        const osc = ctx.createOscillator()
        osc.frequency.setValueAtTime(200, t)
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.2)
        const env = ctx.createGain()
        env.gain.setValueAtTime(0.2, t)
        env.gain.linearRampToValueAtTime(0, t + 0.2)
        osc.connect(env).connect(dest)
        osc.start(t); osc.stop(t + 0.2)
    }),

    playWin: () => playSound('win', (ctx, dest) => {
        const t = ctx.currentTime
        // Casino Major Chord (C G E C) with SuperSaw
        playSuperSaw(523.25, 0.4, t, ctx, dest)
        playSuperSaw(659.25, 0.4, t + 0.05, ctx, dest)
        playSuperSaw(783.99, 0.4, t + 0.1, ctx, dest)
    }),

    playJackpot: () => playSound('jackpot', (ctx, dest) => {
        // Fallback to Win sequence repeated if file missing
        const t = ctx.currentTime
        for (let i = 0; i < 5; i++) {
            playSuperSaw(500 + i * 100, 0.1, t + i * 0.1, ctx, dest)
        }
    }),

    playLoss: () => playSound('loss', (ctx, dest) => {
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        osc.type = 'triangle' // Softer than sawtooth
        osc.frequency.setValueAtTime(150, t)
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.3)
        const env = ctx.createGain()
        env.gain.setValueAtTime(0.3, t)
        env.gain.linearRampToValueAtTime(0, t + 0.3)
        osc.connect(env).connect(dest)
        osc.start(t); osc.stop(t + 0.3)
    })
}
