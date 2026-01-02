// Advanced Hybrid Audio Manager
// Supports MP3s (if available in public/sounds/) or falls back to Pro-Procedural Synth
// Sounds like a real casino, not a robot.

const AudioContext = window.AudioContext || (window as any).webkitAudioContext
const audioCtx = new AudioContext()

const gainNode = audioCtx.createGain()
gainNode.connect(audioCtx.destination)

let isMuted = localStorage.getItem('zimbet_muted') === 'true'
gainNode.gain.value = isMuted ? 0 : 0.6

// File-based assets (User can drop these in public/sounds/)
const ASSETS: Record<string, HTMLAudioElement> = {
    click: new Audio('/sounds/click.mp3'),
    hover: new Audio('/sounds/hover.mp3'),
    win: new Audio('/sounds/win.mp3'),
    loss: new Audio('/sounds/loss.mp3'),
    spin: new Audio('/sounds/spin.mp3'),
    crash: new Audio('/sounds/crash.mp3'),
    coin: new Audio('/sounds/coin.mp3')
}

// Preload (silent fail if missing)
Object.values(ASSETS).forEach(audio => {
    audio.volume = 0.5
})

// --- PRO SYNTHESIS ENGINE ---

// Helper: Play a sound, prefer file, fallback to synth
async function playSound(name: keyof typeof ASSETS, synthFn: () => void) {
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

    synthFn()
}

// 1. SuperSaw (Rich, thick sound for wins)
function playSuperSaw(freq: number, duration: number, time: number) {
    const osc1 = audioCtx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = freq
    const osc2 = audioCtx.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = freq * 1.01 // Detune
    const osc3 = audioCtx.createOscillator(); osc3.type = 'sawtooth'; osc3.frequency.value = freq * 0.99 // Detune

    const env = audioCtx.createGain()
    env.gain.setValueAtTime(0.1, time)
    env.gain.exponentialRampToValueAtTime(0.01, time + duration)

    osc1.connect(env); osc2.connect(env); osc3.connect(env)
    env.connect(gainNode)

    osc1.start(time); osc2.start(time); osc3.start(time)
    osc1.stop(time + duration); osc2.stop(time + duration); osc3.stop(time + duration)
}

// 2. FM Bell (Metallic, coin-like)
function playFMBell(freq: number, duration: number, time: number) {
    const carrier = audioCtx.createOscillator()
    const modulator = audioCtx.createOscillator()
    const modGain = audioCtx.createGain()
    const masterGain = audioCtx.createGain()

    carrier.frequency.value = freq
    modulator.frequency.value = freq * 2.5 // Ratio for metallic
    modGain.gain.value = 1000 // Modulation depth

    modulator.connect(modGain)
    modGain.connect(carrier.frequency)
    carrier.connect(masterGain)
    masterGain.connect(gainNode)

    masterGain.gain.setValueAtTime(0.3, time)
    masterGain.gain.exponentialRampToValueAtTime(0.01, time + duration)

    carrier.start(time); modulator.start(time)
    carrier.stop(time + duration); modulator.stop(time + duration)
}

// 3. Crisp Click (Filtered Noise)
function playCrispClick(time: number) {
    const bufferSize = audioCtx.sampleRate * 0.05 // 50ms
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const noise = audioCtx.createBufferSource()
    noise.buffer = buffer

    const filter = audioCtx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 2000

    const env = audioCtx.createGain()
    env.gain.setValueAtTime(0.5, time)
    env.gain.exponentialRampToValueAtTime(0.01, time + 0.05)

    noise.connect(filter).connect(env).connect(gainNode)
    noise.start(time)
}

export const soundManager = {
    toggleMute: () => {
        isMuted = !isMuted
        gainNode.gain.value = isMuted ? 0 : 0.6
        localStorage.setItem('zimbet_muted', String(isMuted))
        return isMuted
    },
    isMuted: () => isMuted,

    playClick: () => playSound('click', () => {
        const t = audioCtx.currentTime
        playCrispClick(t)
    }),

    playHover: () => playSound('hover', () => {
        // Very subtle blip
        const t = audioCtx.currentTime
        const osc = audioCtx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, t)
        const env = audioCtx.createGain()
        env.gain.setValueAtTime(0.05, t)
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.02)
        osc.connect(env).connect(gainNode)
        osc.start(t); osc.stop(t + 0.03)
    }),

    playCoin: () => playSound('coin', () => {
        playFMBell(1200, 0.3, audioCtx.currentTime)
    }),

    // Alias Gem to Coin or new Sound
    playGem: () => playSound('coin', () => {
        const t = audioCtx.currentTime
        playFMBell(1500, 0.1, t)
        playFMBell(2000, 0.2, t + 0.05)
    }),

    playAction: () => playSound('spin', () => {
        const t = audioCtx.currentTime
        // Rising futuristic swipe
        const osc = audioCtx.createOscillator()
        osc.frequency.setValueAtTime(200, t)
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.2)
        const env = audioCtx.createGain()
        env.gain.setValueAtTime(0.2, t)
        env.gain.linearRampToValueAtTime(0, t + 0.2)
        osc.connect(env).connect(gainNode)
        osc.start(t); osc.stop(t + 0.2)
    }),

    playWin: () => playSound('win', () => {
        const t = audioCtx.currentTime
        // Casino Major Chord (C G E C) with SuperSaw
        playSuperSaw(523.25, 0.4, t)
        playSuperSaw(659.25, 0.4, t + 0.05)
        playSuperSaw(783.99, 0.4, t + 0.1)
        playSuperSaw(1046.50, 0.8, t + 0.15)
        // Add coin jingling sound layer
        setTimeout(() => playFMBell(1500, 0.2, t + 0.1), 100)
    }),

    playJackpot: () => playSound('win', () => {
        // Big Win sequence
        const t = audioCtx.currentTime
        for (let i = 0; i < 10; i++) {
            playSuperSaw(500 + i * 100, 0.1, t + i * 0.1)
        }
    }),

    playLoss: () => playSound('loss', () => {
        const t = audioCtx.currentTime
        const osc = audioCtx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(150, t)
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.4)
        const env = audioCtx.createGain()
        env.gain.setValueAtTime(0.3, t)
        env.gain.linearRampToValueAtTime(0, t + 0.4)
        osc.connect(env).connect(gainNode)
        osc.start(t); osc.stop(t + 0.4)
    })
}
