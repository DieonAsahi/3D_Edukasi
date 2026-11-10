import { useAcousticFeedback } from './useAcousticFeedback'
import { useVoiceRegistry } from './useVoiceRegistry'

export type CharacterState = 'idle' | 'listening' | 'thinking' | 'talking'

export const useCharacterState = () => {
  const characterState = useState<CharacterState>('aura_character_state', () => 'idle')
  const { playAuraPing } = useAcousticFeedback()
  const { getIndonesianVoiceSync, getIndonesianVoiceAsync } = useVoiceRegistry()

  const setCharacterState = (state: CharacterState) => {
    characterState.value = state
  }

  // Play a quick low-latency audio filler and sound ping while waiting for AI response
  const playThinkingFiller = async () => {
    setCharacterState('thinking')
    playAuraPing()

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    try {
      const fillers = [
        'Hmm, aku mengerti...',
        'Hmm, baik...',
        'Aku mendengarkanmu...',
        'Aku mencatat perasaanmu...'
      ]
      const chosenFiller = fillers[Math.floor(Math.random() * fillers.length)]
      const utterance = new SpeechSynthesisUtterance(chosenFiller)
      utterance.lang = 'id-ID'
      utterance.rate = 1.05
      utterance.pitch = 1.1

      // Search cached Indonesian voice or async resolve
      let indonesianVoice = getIndonesianVoiceSync()
      if (!indonesianVoice) {
        indonesianVoice = await getIndonesianVoiceAsync(250)
      }

      if (indonesianVoice) {
        utterance.voice = indonesianVoice
      }

      // Do not interrupt the thinking state when filler ends, keep thinking until AI response arrives
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.warn('Could not play thinking filler audio:', e)
    }
  }

  return {
    characterState,
    setCharacterState,
    playThinkingFiller
  }
}
