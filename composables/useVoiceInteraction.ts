import { ref } from 'vue'
import { useCharacterState } from './useCharacterState'
import { useVoiceRegistry } from './useVoiceRegistry'

export const useVoiceInteraction = () => {
  const { characterState, setCharacterState } = useCharacterState()
  const { initVoiceRegistry, getIndonesianVoiceAsync } = useVoiceRegistry()

  const isSupported = ref(false)
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const isMicPermissionGranted = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const errorMessage = ref('')
  const isMuted = ref(false)

  // Internal references
  let recognition: any = null
  let isHolding = false
  let pauseSilenceTimer: any = null
  const PAUSE_TOLERANCE_MS = 2500 // 2500ms pause tolerance per PRD specifications

  // Initialize Speech Recognition & Voice Registry lazily
  const initSpeechRecognition = () => {
    if (typeof window === 'undefined') return false

    initVoiceRegistry()

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      errorMessage.value = 'Browser Anda belum mendukung Web Speech API STT. Silakan gunakan input teks.'
      isSupported.value = false
      return false
    }

    isSupported.value = true

    if (!recognition) {
      recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'id-ID'

      recognition.onstart = () => {
        isListening.value = true
        setCharacterState('listening')
        errorMessage.value = ''
      }

      recognition.onresult = (event: any) => {
        let finalChunk = ''
        let interimChunk = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i]
          if (res.isFinal) {
            finalChunk += res[0].transcript
          } else {
            interimChunk += res[0].transcript
          }
        }

        if (finalChunk) {
          transcript.value = (transcript.value + ' ' + finalChunk).trim()
        }
        interimTranscript.value = interimChunk
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error)
        isListening.value = false
        if (characterState.value === 'listening') {
          setCharacterState('idle')
        }

        if (event.error === 'not-allowed') {
          isMicPermissionGranted.value = false
          errorMessage.value = 'Izin mikrofon ditolak. Aktifkan izin mikrofon di pengaturan browser.'
        } else if (event.error !== 'no-speech') {
          errorMessage.value = `STT Info: ${event.error}`
        }
      }

      recognition.onend = () => {
        // Pause tolerance: if user is still holding Push-to-Talk, restart recognition
        if (isHolding) {
          try {
            recognition.start()
            return
          } catch {
            // Already active or busy
          }
        }
        isListening.value = false
        if (characterState.value === 'listening') {
          setCharacterState('idle')
        }
      }
    }

    return true
  }

  // Request Mic Permission explicitly on user action
  const requestMicPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      isMicPermissionGranted.value = true
      initSpeechRecognition()
      return true
    } catch (err: any) {
      console.warn('Microphone permission not granted:', err)
      isMicPermissionGranted.value = false
      errorMessage.value = 'Izin mikrofon diperlukan untuk fitur Push-to-Talk suara.'
      return false
    }
  }

  // Push-to-Talk: Start holding
  const startPushToTalk = async () => {
    isHolding = true
    transcript.value = ''
    interimTranscript.value = ''

    if (pauseSilenceTimer) {
      clearTimeout(pauseSilenceTimer)
      pauseSilenceTimer = null
    }

    if (!recognition) {
      const ok = initSpeechRecognition()
      if (!ok) return
    }

    // Stop ongoing TTS if user starts speaking
    stopSpeaking()

    try {
      recognition.start()
    } catch {
      // Recognition might already be active
    }
  }

  // Push-to-Talk: Release hold with 2500ms pause grace period
  const stopPushToTalk = (): Promise<string> => {
    return new Promise((resolve) => {
      isHolding = false

      if (pauseSilenceTimer) clearTimeout(pauseSilenceTimer)
      pauseSilenceTimer = setTimeout(() => {
        try {
          if (recognition) {
            recognition.stop()
          }
        } catch {
          // Handled
        }

        const completeText = (transcript.value + ' ' + interimTranscript.value).trim()
        interimTranscript.value = ''
        pauseSilenceTimer = null

        // If no text was spoken, safely revert character to idle
        if (!completeText && characterState.value === 'listening') {
          setCharacterState('idle')
        }

        resolve(completeText)
      }, PAUSE_TOLERANCE_MS)
    })
  }

  // Text-to-Speech (TTS) with asynchronous voice loading & race-condition safety
  const speakText = async (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.')
      setCharacterState('idle')
      return
    }

    if (isMuted.value || !text) {
      setCharacterState('idle')
      return
    }

    // 1. Explicitly cancel any prior utterance
    window.speechSynthesis.cancel()

    // Clean text from markdown formatting for natural reading
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'id-ID'
    utterance.rate = 1.0
    utterance.pitch = 1.05

    // Asynchronously resolve Indonesian voice (ensuring Chrome onvoiceschanged is handled)
    const idVoice = await getIndonesianVoiceAsync(400)
    if (idVoice) {
      utterance.voice = idVoice
    }

    utterance.onstart = () => {
      isSpeaking.value = true
      setCharacterState('talking')
    }

    utterance.onend = () => {
      isSpeaking.value = false
      if (characterState.value === 'talking') {
        setCharacterState('idle')
      }
    }

    utterance.onerror = (e) => {
      console.warn('TTS playback error/interrupted:', e)
      isSpeaking.value = false
      if (characterState.value === 'talking') {
        setCharacterState('idle')
      }
    }

    // Small delay after cancel() to ensure browser audio queue is fully purged
    setTimeout(() => {
      if (!isMuted.value) {
        window.speechSynthesis.speak(utterance)
      } else {
        setCharacterState('idle')
      }
    }, 60)
  }

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    isSpeaking.value = false
    if (characterState.value === 'talking') {
      setCharacterState('idle')
    }
  }

  const toggleMute = () => {
    isMuted.value = !isMuted.value
    if (isMuted.value) {
      stopSpeaking()
      if (characterState.value === 'talking') {
        setCharacterState('idle')
      }
    }
  }

  return {
    isSupported,
    isListening,
    isSpeaking,
    isMuted,
    isMicPermissionGranted,
    transcript,
    interimTranscript,
    errorMessage,
    initSpeechRecognition,
    requestMicPermission,
    startPushToTalk,
    stopPushToTalk,
    speakText,
    stopSpeaking,
    toggleMute
  }
}
