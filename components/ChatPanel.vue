<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  Mic,
  Send,
  Volume2,
  VolumeX,
  Wind,
  CheckSquare,
  Sparkles,
  Loader2,
  HeartHandshake,
  ShieldAlert,
  PhoneCall,
  ExternalLink,
  X
} from 'lucide-vue-next'
import { useVoiceInteraction } from '~/composables/useVoiceInteraction'
import { useCharacterState } from '~/composables/useCharacterState'
import { useAuraAuth } from '~/composables/useAuraAuth'
import { useAuraSeed } from '~/composables/useAuraSeed'

const emit = defineEmits<{
  (e: 'trigger-breathing'): void
  (e: 'trigger-productivity', task?: { title: string; duration_minutes: number }): void
}>()

interface MessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  emotion_detected?: string
  stress_level?: 'low' | 'medium' | 'high'
  suggested_intervention?: 'none' | 'box_breathing' | 'time_blocking'
  recommended_task?: {
    title: string | null
    duration_minutes: number
  } | null
  is_crisis?: boolean
  crisis_resources?: {
    hotline_name: string
    hotline_number: string
    whatsapp: string
    alternative: string
  }
  timestamp: string
}

const {
  isSupported: isVoiceSupported,
  isListening,
  isSpeaking,
  isMuted,
  isMicPermissionGranted,
  transcript,
  interimTranscript,
  errorMessage: voiceErrorMessage,
  requestMicPermission,
  startPushToTalk,
  stopPushToTalk,
  speakText,
  stopSpeaking,
  toggleMute
} = useVoiceInteraction()

const { characterState, playThinkingFiller } = useCharacterState()
const { currentUser, isGuest, isSupabaseConfigured } = useAuraAuth()
const { ensureSeedData } = useAuraSeed()
const supabase = useSupabaseClient()

const textInput = ref('')
const isSending = ref(false)
const hasStartedSession = ref(false)
const isHoldingPTT = ref(false)
const chatScrollContainer = ref<HTMLElement | null>(null)

// Safety Guardrail (SDG 3) State
const showCrisisAlert = ref(false)

// Messages state
const messages = ref<MessageItem[]>([
  {
    id: 'welcome_1',
    role: 'assistant',
    content: 'Halo, aku Ara. Aku di sini untuk mendengarkan ceritamu tanpa menghakimi. Apa yang sedang kamu rasakan atau pikirkan hari ini?',
    emotion_detected: 'neutral',
    stress_level: 'low',
    suggested_intervention: 'none',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
])

const scrollToBottom = async () => {
  await nextTick()
  if (chatScrollContainer.value) {
    chatScrollContainer.value.scrollTop = chatScrollContainer.value.scrollHeight
  }
}

// Persist chat to local storage for guest / dummy mode
const saveLocalChat = (msg: Partial<MessageItem> & { role: 'user' | 'assistant'; content: string; action_triggered?: string }) => {
  if (typeof window === 'undefined') return
  try {
    const existing = JSON.parse(localStorage.getItem('aura_local_chat_messages') || '[]')
    existing.push({
      ...msg,
      created_at: new Date().toISOString()
    })
    localStorage.setItem('aura_local_chat_messages', JSON.stringify(existing))
  } catch (err) {
    console.warn('Could not save local chat message:', err)
  }
}

// Start Session explicitly (requests mic permission gracefully)
const handleStartSession = async () => {
  hasStartedSession.value = true
  await requestMicPermission()
}

// Push to Talk Handlers (Mouse & Touch)
const handlePTTDown = async (event: MouseEvent | TouchEvent) => {
  event.preventDefault()
  if (!hasStartedSession.value) {
    hasStartedSession.value = true
  }

  isHoldingPTT.value = true
  await startPushToTalk()
}

const handlePTTUp = async (event: MouseEvent | TouchEvent) => {
  event.preventDefault()
  if (!isHoldingPTT.value) return

  isHoldingPTT.value = false
  const recordedText = await stopPushToTalk()

  if (recordedText && recordedText.trim()) {
    await sendMessage(recordedText.trim())
  }
}

// Keyboard Spacebar Push-to-Talk Handler
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }

  if (e.code === 'Space' && !e.repeat && !isHoldingPTT.value) {
    e.preventDefault()
    isHoldingPTT.value = true
    startPushToTalk()
  }
}

const handleKeyUp = async (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }

  if (e.code === 'Space' && isHoldingPTT.value) {
    e.preventDefault()
    isHoldingPTT.value = false
    const recordedText = await stopPushToTalk()
    if (recordedText && recordedText.trim()) {
      await sendMessage(recordedText.trim())
    }
  }
}

onMounted(() => {
  ensureSeedData()
  if (typeof window !== 'undefined') {
    try {
      const localChats = localStorage.getItem('aura_local_chat_messages')
      if (localChats) {
        const parsed = JSON.parse(localChats)
        if (Array.isArray(parsed) && parsed.length > 0) {
          messages.value = parsed.map((m: any, idx: number) => ({
            id: m.id || `msg_${idx}`,
            role: m.role,
            content: m.content,
            emotion_detected: m.emotion_detected,
            stress_level: m.stress_level,
            suggested_intervention: m.suggested_intervention || (m.action_triggered === 'pomodoro' ? 'time_blocking' : m.action_triggered),
            recommended_task: m.recommended_task,
            is_crisis: m.is_crisis,
            crisis_resources: m.crisis_resources,
            timestamp: m.timestamp || (m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')
          }))
        }
      }
    } catch (err) {
      console.warn('Error loading local chat history:', err)
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  scrollToBottom()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  stopSpeaking()
})

// Send Message Handler
const sendMessage = async (rawMessage?: string) => {
  const content = (rawMessage || textInput.value).trim()
  if (!content || isSending.value) return

  textInput.value = ''
  isSending.value = true

  const userMsg: MessageItem = {
    id: 'user_' + Date.now(),
    role: 'user',
    content,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  messages.value.push(userMsg)
  scrollToBottom()

  // Save to Supabase if authenticated and configured, or localStorage if guest
  if (isSupabaseConfigured.value && currentUser.value?.id && !isGuest.value) {
    try {
      await supabase.from('chat_messages').insert({
        user_id: currentUser.value.id,
        role: 'user',
        content,
        action_triggered: 'none'
      })
    } catch (err) {
      console.warn('Could not persist chat to Supabase:', err)
    }
  } else {
    saveLocalChat({ role: 'user', content, action_triggered: 'none' })
  }

  // 1. LATENCY MASKING:
  // Immediately switch Aura's state to 'thinking' and play short filler audio
  playThinkingFiller()

  try {
    // 2. Call server route /server/api/chat.post.ts
    const historyPayload = messages.value.slice(-6).map(m => ({
      role: m.role,
      content: m.content
    }))

    const response = await $fetch<{
      reply: string
      emotion_detected: 'tired' | 'anxious' | 'sad' | 'neutral' | 'motivated'
      stress_level: 'low' | 'medium' | 'high'
      suggested_intervention: 'none' | 'box_breathing' | 'time_blocking'
      recommended_task: {
        title: string | null
        duration_minutes: number
      } | null
      is_crisis?: boolean
      crisis_resources?: {
        hotline_name: string
        hotline_number: string
        whatsapp: string
        alternative: string
      }
    }>('/api/chat', {
      method: 'POST',
      body: {
        message: content,
        history: historyPayload,
        userName: currentUser.value?.displayName
      }
    })

    // Safety Guardrail: Trigger Crisis Hotline Banner if detected
    if (response.is_crisis) {
      showCrisisAlert.value = true
    }

    const assistantMsg: MessageItem = {
      id: 'aura_' + Date.now(),
      role: 'assistant',
      content: response.reply,
      emotion_detected: response.emotion_detected,
      stress_level: response.stress_level,
      suggested_intervention: response.suggested_intervention,
      recommended_task: response.recommended_task,
      is_crisis: response.is_crisis,
      crisis_resources: response.crisis_resources,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    messages.value.push(assistantMsg)
    scrollToBottom()

    // Save assistant message to DB / localStorage
    const actionTriggered = response.suggested_intervention === 'time_blocking'
      ? 'pomodoro'
      : (response.suggested_intervention || 'none')

    if (isSupabaseConfigured.value && currentUser.value?.id && !isGuest.value) {
      try {
        await supabase.from('chat_messages').insert({
          user_id: currentUser.value.id,
          role: 'assistant',
          content: response.reply,
          action_triggered: actionTriggered
        })
      } catch (err) {
        console.warn('Could not persist assistant reply:', err)
      }
    } else {
      saveLocalChat({
        ...assistantMsg,
        action_triggered: actionTriggered
      })
    }

    // 3. VOICE OUTPUT (TTS):
    // Sync with 3D character animation (cancel any latency filler audio before speaking)
    speakText(response.reply)

  } catch (err: any) {
    console.error('Chat error:', err)
    messages.value.push({
      id: 'err_' + Date.now(),
      role: 'assistant',
      content: 'Maaf, terjadi kendala saat menghubungkan ke otak AI. Namun aku tetap di sini bersamamu. Tarik napas perlahan ya.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
    scrollToBottom()
    // Safe character state reset on network/API failure
    setCharacterState('idle')
  } finally {
    isSending.value = false
    // Guard against stuck thinking state if speakText did not trigger
    if (!isSpeaking.value && !isListening.value && characterState.value === 'thinking') {
      setTimeout(() => {
        if (!isSpeaking.value && characterState.value === 'thinking') {
          setCharacterState('idle')
        }
      }, 400)
    }
  }
}
</script>

<template>
  <div class="flex flex-col h-full w-full glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
    <!-- Top Sub-Bar (Mute, Clear, Session status) -->
    <div class="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
      <div class="flex items-center gap-2">
        <HeartHandshake class="w-4 h-4 text-purple-400" />
        <span class="text-xs font-semibold text-slate-200">Sesi Konseling CBT & Produktivitas</span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Voice Mute Toggle -->
        <button
          type="button"
          @click="toggleMute"
          class="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          :title="isMuted ? 'Nyalakan Suara Ara' : 'Bisukan Suara Ara'"
        >
          <VolumeX v-if="isMuted" class="w-4 h-4 text-rose-400" />
          <Volume2 v-else class="w-4 h-4 text-purple-400" />
        </button>
      </div>
    </div>

    <!-- Safety Guardrail Banner (SDG 3: Emergency Crisis Hotline) -->
    <div
      v-if="showCrisisAlert"
      class="p-3.5 mx-4 mt-3 rounded-2xl bg-gradient-to-r from-rose-950/80 via-red-900/70 to-slate-900 border border-rose-500/50 shadow-lg text-left relative overflow-hidden animate-pulse-slow"
    >
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="flex items-center gap-2 text-rose-300 font-bold text-xs sm:text-sm">
          <ShieldAlert class="w-4 h-4 text-rose-400 shrink-0" />
          <span>Bantuan Darurat Kesehatan Jiwa Tersedia 24/7 (Gratis)</span>
        </div>
        <button
          type="button"
          @click="showCrisisAlert = false"
          class="p-1 rounded text-rose-400 hover:text-white hover:bg-white/10"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
      <p class="text-[11px] text-slate-200 leading-relaxed mb-3">
        Jika kamu atau orang yang kamu kenal sedang mengalami krisis emosional mendalam atau membutuhkan pertolongan segera, kamu tidak sendirian. Silakan hubungi layanan di bawah ini:
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <a
          href="tel:119"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
        >
          <PhoneCall class="w-3.5 h-3.5" />
          <span>Hotline Kemenkes: 119 (ext. 8)</span>
        </a>
        <a
          href="https://wa.me/62811119119"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-all active:scale-95"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          <span>WhatsApp Sejiwa</span>
        </a>
        <a
          href="tel:+628113855472"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-xs font-medium"
        >
          <PhoneCall class="w-3.5 h-3.5" />
          <span>LISA Helpline: 0811-3855-472</span>
        </a>
        <a
          href="tel:+628118436633"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-xs font-medium"
        >
          <PhoneCall class="w-3.5 h-3.5" />
          <span>Yayasan Pulih: 0811-8436-633</span>
        </a>
      </div>
    </div>

    <!-- Onboarding banner if session has not started -->
    <div
      v-if="!hasStartedSession"
      class="p-4 mx-4 mt-3 rounded-2xl bg-gradient-to-r from-purple-900/50 via-indigo-900/40 to-slate-900/60 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3"
    >
      <div class="text-left">
        <p class="text-xs sm:text-sm font-semibold text-purple-200">Siap mencurahkan apa yang kamu rasakan?</p>
        <p class="text-[11px] text-slate-300">Klik tombol ini untuk mengaktifkan mikrofon dan fitur Push-to-Talk suara.</p>
      </div>
      <button
        type="button"
        @click="handleStartSession"
        class="shrink-0 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 active:scale-95 transition-all"
      >
        Mulai Sesi Curhat
      </button>
    </div>

    <!-- Chat Messages Scroll Area -->
    <div
      ref="chatScrollContainer"
      class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scroll-smooth min-h-[220px]"
    >
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex flex-col"
        :class="msg.role === 'user' ? 'items-end' : 'items-start'"
      >
        <div class="flex items-end gap-2 max-w-[88%] sm:max-w-[78%]">
          <!-- Aura Avatar Indicator -->
          <div
            v-if="msg.role === 'assistant'"
            class="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center shrink-0 mb-1"
          >
            <Sparkles class="w-3.5 h-3.5 text-purple-300" />
          </div>

          <div
            class="p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md backdrop-blur-sm transition-all"
            :class="msg.role === 'user'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs'
              : (msg.is_crisis
                ? 'bg-rose-950/40 border-2 border-rose-500/40 text-slate-100 rounded-bl-xs'
                : 'glass-card text-slate-200 rounded-bl-xs border border-white/10')"
          >
            <p class="whitespace-pre-wrap">{{ msg.content }}</p>

            <!-- Safety Hotline Card attached directly to Crisis Message -->
            <div
              v-if="msg.is_crisis"
              class="mt-3 pt-2.5 border-t border-rose-500/30 space-y-2"
            >
              <div class="flex items-center gap-1.5 text-rose-300 font-semibold text-[11px]">
                <ShieldAlert class="w-3.5 h-3.5 text-rose-400" />
                <span>Kontak Bantuan Darurat Kesehatan Mental:</span>
              </div>
              <div class="flex flex-wrap gap-2 pt-1">
                <a
                  href="tel:119"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow"
                >
                  <PhoneCall class="w-3 h-3" />
                  <span>Telepon 119 ext. 8 (Kemenkes)</span>
                </a>
                <a
                  href="https://wa.me/62811119119"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
                >
                  <ExternalLink class="w-3 h-3" />
                  <span>WhatsApp 0811119119</span>
                </a>
                <a
                  href="tel:+628113855472"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-[11px] font-medium"
                >
                  <PhoneCall class="w-3 h-3" />
                  <span>LISA Helpline (0811-3855-472)</span>
                </a>
                <a
                  href="tel:+628118436633"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-[11px] font-medium"
                >
                  <PhoneCall class="w-3 h-3" />
                  <span>Yayasan Pulih (0811-8436-633)</span>
                </a>
              </div>
            </div>

            <!-- Interactive Interventions Triggered by CBT Brain -->
            <div
              v-if="msg.suggested_intervention === 'box_breathing' && !msg.is_crisis"
              class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-1.5 text-[11px] text-cyan-300 font-medium">
                <Wind class="w-3.5 h-3.5" />
                <span>Intervensi: Latihan Pernapasan 4-7-8</span>
              </div>
              <button
                type="button"
                @click="emit('trigger-breathing')"
                class="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-[11px] font-semibold active:scale-95 transition-all"
              >
                Mulai Bernapas
              </button>
            </div>

            <div
              v-if="msg.suggested_intervention === 'time_blocking' && !msg.is_crisis"
              class="mt-3 pt-2.5 border-t border-white/10 flex flex-col gap-2"
            >
              <div class="flex items-center justify-between text-[11px] text-emerald-300 font-medium">
                <div class="flex items-center gap-1.5">
                  <CheckSquare class="w-3.5 h-3.5" />
                  <span>Saran Fokus: {{ msg.recommended_task?.title || 'Pomodoro 25 Menit' }}</span>
                </div>
              </div>
              <button
                type="button"
                @click="emit('trigger-productivity', {
                  title: msg.recommended_task?.title || 'Fokus Langkah Pertama',
                  duration_minutes: msg.recommended_task?.duration_minutes || 25
                })"
                class="w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[11px] font-semibold active:scale-95 transition-all text-center"
              >
                Mulai Timer Fokus Sekarang
              </button>
            </div>

            <!-- Timestamp & Emotion badge -->
            <div class="mt-1 flex items-center justify-end gap-2 text-[10px] text-slate-400">
              <span v-if="msg.emotion_detected && msg.emotion_detected !== 'neutral'" class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 capitalize">
                {{ msg.emotion_detected }}
              </span>
              <span>{{ msg.timestamp }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Transcribing Preview during Push-to-Talk -->
      <div v-if="isListening || interimTranscript" class="flex items-start gap-2">
        <div class="w-7 h-7 rounded-full bg-emerald-500/30 border border-emerald-500/40 flex items-center justify-center shrink-0">
          <Mic class="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
        </div>
        <div class="p-3 rounded-2xl glass-card border border-emerald-500/30 text-emerald-200 text-xs italic flex items-center gap-2">
          <span>{{ transcript || interimTranscript || 'Mendengarkan suaramu...' }}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>
      </div>

      <!-- Thinking Indicator -->
      <div v-if="isSending" class="flex items-center gap-2 text-slate-400 text-xs italic p-2">
        <Loader2 class="w-3.5 h-3.5 animate-spin text-purple-400" />
        <span>Ara sedang merenungi pesanmu...</span>
      </div>
    </div>

    <!-- Voice Error Alert -->
    <div v-if="voiceErrorMessage" class="px-4 py-1.5 bg-rose-500/20 text-rose-300 text-xs border-t border-rose-500/30 text-center">
      {{ voiceErrorMessage }}
    </div>

    <!-- Bottom Controls: Push-to-Talk & Text Input Fallback -->
    <div class="p-3 sm:p-4 border-t border-white/10 bg-slate-900/60 backdrop-blur-md">
      <!-- Push-to-Talk Hero Button -->
      <div class="flex items-center justify-center mb-3">
        <button
          type="button"
          :disabled="isSending"
          @mousedown="handlePTTDown"
          @mouseup="handlePTTUp"
          @mouseleave="handlePTTUp"
          @touchstart="handlePTTDown"
          @touchend="handlePTTUp"
          class="relative group select-none flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-200 shadow-xl"
          :class="isHoldingPTT
            ? 'bg-rose-600 text-white scale-105 shadow-rose-600/40 ring-4 ring-rose-500/30'
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/25 active:scale-95'"
        >
          <!-- Animated pulse ring when recording -->
          <span
            v-if="isHoldingPTT"
            class="absolute inset-0 rounded-2xl bg-rose-500 animate-ping opacity-30"
          />

          <Mic class="w-4 h-4 shrink-0" :class="isHoldingPTT ? 'animate-bounce' : ''" />
          <span>{{ isHoldingPTT ? 'Lepas untuk Mengirim Suara' : 'Tahan untuk Bicara (Push-to-Talk)' }}</span>

          <span class="hidden sm:inline-block ml-1 text-[10px] font-normal px-2 py-0.5 rounded bg-black/20 text-purple-200">
            atau Tahan Spasi
          </span>
        </button>
      </div>

      <!-- Text Input Fallback -->
      <form @submit.prevent="sendMessage()" class="flex items-center gap-2">
        <input
          v-model="textInput"
          type="text"
          placeholder="Ketik curhatanmu untuk Ara di sini jika tidak ingin bersuara..."
          class="flex-1 px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
        />

        <button
          type="submit"
          :disabled="!textInput.trim() || isSending"
          class="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-40 text-white transition-all shadow-md shadow-purple-600/20"
          title="Kirim pesan teks"
        >
          <Send class="w-4 h-4" />
        </button>
      </form>
    </div>
  </div>
</template>
