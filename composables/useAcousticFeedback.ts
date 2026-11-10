// Pure Web Audio API Sound Synthesizer ($0 cost, 0 external assets, zero lag)
export const useAcousticFeedback = () => {
  let audioCtx: AudioContext | null = null

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        audioCtx = new AudioContextClass()
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    return audioCtx
  }

  // 1. Calming Meditation Chime (Used for Box Breathing transitions)
  const playCalmingChime = (freq = 432) => {
    const ctx = getAudioContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)

    // Smooth gentle attack and long decay
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.8)
  }

  // 2. Uplifting Achievement Chime (Used when Pomodoro or task completes)
  const playSuccessChime = () => {
    const ctx = getAudioContext()
    if (!ctx) return

    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12)

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + idx * 0.12 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.8)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime + idx * 0.12)
      osc.stop(ctx.currentTime + idx * 0.12 + 0.8)
    })
  }

  // 3. Gentle Aura Filler Ping (Used during latency masking)
  const playAuraPing = () => {
    const ctx = getAudioContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4)

    gain.gain.setValueAtTime(0.05, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  }

  return {
    playCalmingChime,
    playSuccessChime,
    playAuraPing
  }
}

