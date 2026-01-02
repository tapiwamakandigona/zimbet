// Synthesized Sound Effects using Web Audio API
// No external assets required!

const AudioContext = window.AudioContext || (window as any).webkitAudioContext
const audioCtx = new AudioContext()

const gainNode = audioCtx.createGain()
gainNode.connect(audioCtx.destination)

// Mute State
let isMuted = localStorage.getItem('zimbet_muted') === 'true'
gainNode.gain.value = isMuted ? 0 : 0.5 // Master volume

function createOscillator(type: OscillatorType, frequency: number, duration: number, startTime: number) {
    const osc = audioCtx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, startTime)

    // Envelope to avoid clicking
    const envelope = audioCtx.createGain()
    envelope.connect(gainNode)
    osc.connect(envelope)

    envelope.gain.setValueAtTime(0, startTime)
    envelope.gain.linearRampToValueAtTime(1, startTime + 0.01)
    envelope.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

    osc.start(startTime)
    osc.stop(startTime + duration)
}

export const soundManager = {
    toggleMute: () => {
        isMuted = !isMuted
        gainNode.gain.value = isMuted ? 0 : 0.5
        localStorage.setItem('zimbet_muted', String(isMuted))
        return isMuted
    },
    isMuted: () => isMuted,

    // Navigation / UI Click
    playClick: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume()
        createOscillator('sine', 800, 0.05, audioCtx.currentTime)
    },

    // Soft UI tick (hover)
    playHover: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume()
        createOscillator('triangle', 400, 0.02, audioCtx.currentTime)
    },

    // Game Action (Bet, Flip, Spin start)
    playAction: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume()
        const t = audioCtx.currentTime
        createOscillator('square', 400, 0.1, t)
        createOscillator('square', 600, 0.1, t + 0.05)
    },

    // Success / Gem Found
    playGem: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume()
        const t = audioCtx.currentTime
        // High pitch ding
        createOscillator('sine', 1200, 0.1, t)
        createOscillator('triangle', 1800, 0.2, t)
    },

    // Win / Cashout
    playWin: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume()
        const t = audioCtx.currentTime
        // Major chord arpeggio
        createOscillator('triangle', 523.25, 0.2, t)       // C5
        createOscillator('triangle', 659.25, 0.2, t + 0.1) // E5
        createOscillator('triangle', 783.99, 0.2, t + 0.2) // G5
        createOscillator('triangle', 1046.50, 0.4, t + 0.3)// C6
    },

    // Big Win
    playJackpot: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume()
        const t = audioCtx.currentTime
        // Rapid succession
        for (let i = 0; i < 8; i++) {
            createOscillator('square', 800 + (i * 100), 0.1, t + (i * 0.08))
        }
    },

    // Loss / Explode / Crash
    playLoss: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume()
        const t = audioCtx.currentTime

        // Noise buffer for explosion
        const bufferSize = audioCtx.sampleRate * 0.5 // 0.5 seconds
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1
        }

        const noise = audioCtx.createBufferSource()
        noise.buffer = buffer

        const noiseFilter = audioCtx.createBiquadFilter()
        noiseFilter.type = 'lowpass'
        noiseFilter.frequency.setValueAtTime(1000, t)
        noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 0.5)

        const envelope = audioCtx.createGain()
        envelope.gain.setValueAtTime(1, t)
        envelope.gain.exponentialRampToValueAtTime(0.01, t + 0.5)

        noise.connect(noiseFilter)
        noiseFilter.connect(envelope)
        envelope.connect(gainNode)

        noise.start(t)

        // Descending tone
        const osc = audioCtx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(200, t)
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.5)

        const oscEnv = audioCtx.createGain()
        oscEnv.gain.setValueAtTime(0.5, t)
        oscEnv.gain.linearRampToValueAtTime(0, t + 0.5)

        osc.connect(oscEnv)
        oscEnv.connect(gainNode)
        osc.start(t)
    }
}
