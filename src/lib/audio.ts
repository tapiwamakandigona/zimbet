// Advanced Hybrid Audio Manager
// Supports MP3s (if available in public/sounds/) or falls back to Pro-Procedural Synth

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

// File-based assets (User can drop these in public/sounds/)
const ASSETS: Record<string, HTMLAudioElement> = {
    click: new Audio('/zimbet/sounds/click.mp3'),
    hover: new Audio('/zimbet/sounds/hover.mp3'),
    win: new Audio('/zimbet/sounds/win.mp3'),
    loss: new Audio('/zimbet/sounds/loss.mp3'),
    spin: new Audio('/zimbet/sounds/spin.mp3'),
    crash: new Audio('/zimbet/sounds/crash.mp3'),
    coin: new Audio('/zimbet/sounds/coin.mp3')
}

// Preload (silent fail if missing)
Object.values(ASSETS).forEach(audio => {
    audio.volume = 0.5
})

// --- PRO SYNTHESIS ENGINE ---

// Helper: Play a sound, prefer file, fallback to synth
async function playSound(name: keyof typeof ASSETS, synthFn: (ctx: AudioContext, dest: AudioNode) => void) {
    const { audioCtx, gainNode } = getContext()

    if (audioCtx.state === 'suspended') await audioCtx.resume()
    if (isMuted) return

    // Hybrid with Try-Catch
    const audio = ASSETS[name]
    try {
        if (audio) {
            audio.currentTime = 0
            audio.play().catch(() => { })
        }
    } catch (e) { }

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

    // GC Cleanup
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

// 3. Crisp Click (Filtered Noise)
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
    env.gain.setValueAtTime(0.5, time)
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
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, t)
        const env = ctx.createGain()
        env.gain.setValueAtTime(0.05, t)
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.02)
        osc.connect(env).connect(dest)
        osc.start(t); osc.stop(t + 0.03)
        setTimeout(() => { osc.disconnect(); env.disconnect(); }, 50)
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
        setTimeout(() => { osc.disconnect(); env.disconnect(); }, 250)
    }),

    playWin: () => playSound('win', (ctx, dest) => {
        const t = ctx.currentTime
        // Casino Major Chord (C G E C) with SuperSaw
        playSuperSaw(523.25, 0.4, t, ctx, dest)
        playSuperSaw(659.25, 0.4, t + 0.05, ctx, dest)
        playSuperSaw(783.99, 0.4, t + 0.1, ctx, dest)
        playSuperSaw(1046.50, 0.8, t + 0.15, ctx, dest)
        // Add coin jingling sound layer
        setTimeout(() => playFMBell(1500, 0.2, t + 0.1, ctx, dest), 100)
    }),

    playJackpot: () => playSound('win', (ctx, dest) => {
        // Big Win sequence
        const t = ctx.currentTime
        for (let i = 0; i < 10; i++) {
            playSuperSaw(500 + i * 100, 0.1, t + i * 0.1, ctx, dest)
        }
    }),

    playLoss: () => playSound('loss', (ctx, dest) => {
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(150, t)
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.4)
        const env = ctx.createGain()
        env.gain.setValueAtTime(0.3, t)
        env.gain.linearRampToValueAtTime(0, t + 0.4)
        osc.connect(env).connect(dest)
        osc.start(t); osc.stop(t + 0.4)
        setTimeout(() => { osc.disconnect(); env.disconnect(); }, 450)
    })
}
