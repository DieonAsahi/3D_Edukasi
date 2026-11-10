import { ref } from 'vue'

// Shared state for cached voices across all components
const cachedVoices = ref<SpeechSynthesisVoice[]>([])
const isVoicesLoaded = ref(false)
let isInitialized = false

export const useVoiceRegistry = () => {
  const populateVoices = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const voices = window.speechSynthesis.getVoices()
    if (voices && voices.length > 0) {
      cachedVoices.value = voices
      isVoicesLoaded.value = true
    }
  }

  const initVoiceRegistry = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || isInitialized) return
    isInitialized = true

    populateVoices()

    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        populateVoices()
      }
    }
  }

  // Find preferred Indonesian voice with prioritization
  const findIndonesianVoice = (voiceList: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (!voiceList || voiceList.length === 0) return null

    // Priority 1: High-quality natural voices specifically named Google or Gadis or Indonesian
    const preferred = voiceList.find(v =>
      (v.lang.includes('id') || v.lang.includes('ID') || v.lang.toLowerCase().startsWith('id')) &&
      (v.name.toLowerCase().includes('google') ||
       v.name.toLowerCase().includes('gadis') ||
       v.name.toLowerCase().includes('indonesia'))
    )
    if (preferred) return preferred

    // Priority 2: Any voice tagged with id-ID or id_ID
    const anyIdVoice = voiceList.find(v =>
      v.lang.includes('id') ||
      v.lang.includes('ID') ||
      v.lang.toLowerCase().startsWith('id')
    )
    if (anyIdVoice) return anyIdVoice

    // Priority 3: Name includes Indonesia
    const nameMatch = voiceList.find(v => v.name.toLowerCase().includes('indonesia'))
    if (nameMatch) return nameMatch

    return null
  }

  // Synchronous getter from cache
  const getIndonesianVoiceSync = (): SpeechSynthesisVoice | null => {
    populateVoices()
    return findIndonesianVoice(cachedVoices.value)
  }

  // Asynchronous getter ensuring Chrome has loaded voices
  const getIndonesianVoiceAsync = async (timeoutMs = 600): Promise<SpeechSynthesisVoice | null> => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null

    // First attempt synchronous lookup
    populateVoices()
    const syncMatch = findIndonesianVoice(cachedVoices.value)
    if (syncMatch) return syncMatch

    // Wait for voiceschanged event or timeout
    return new Promise((resolve) => {
      let resolved = false

      const onVoicesChanged = () => {
        if (resolved) return
        resolved = true
        populateVoices()
        resolve(findIndonesianVoice(cachedVoices.value))
      }

      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged, { once: true })
      }

      setTimeout(() => {
        if (!resolved) {
          resolved = true
          populateVoices()
          resolve(findIndonesianVoice(cachedVoices.value))
        }
      }, timeoutMs)
    })
  }

  return {
    cachedVoices,
    isVoicesLoaded,
    initVoiceRegistry,
    getIndonesianVoiceSync,
    getIndonesianVoiceAsync
  }
}

