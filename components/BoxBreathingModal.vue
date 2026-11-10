<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Wind, X, Play, Square, RotateCcw, Sparkles } from 'lucide-vue-next'
import { useAcousticFeedback } from '~/composables/useAcousticFeedback'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { playCalmingChime } = useAcousticFeedback()

type BreathingMode = '478' | 'box'
type BreathingPhase = 'inhale' | 'hold1' | 'exhale' | 'hold2'

const mode = ref<BreathingMode>('478') // Default 4-7-8 as requested in PRD
const isActive = ref(true)
const phase = ref<BreathingPhase>('inhale')
const secondsLeft = ref(4)
const completedCycles = ref(0)
let timer: any = null

const phaseDurations = computed(() => {
  if (mode.value === '478') {
    return {
      inhale: 4,
      hold1: 7,
      exhale: 8,
      hold2: 0 // Not used in 4-7-8
    }
  }
  return {
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4
  }
})

const phaseDetails = computed(() => {
  switch (phase.value) {
    case 'inhale':
      return {
        title: 'Tarik Napas',
        sub: mode.value === '478'
          ? 'Tarik napas perlahan dan tenang melalui hidung selama 4 detik.'
          : 'Tarik napas perlahan melalui hidung, rasakan paru-parumu mengembang.',
        color: 'text-cyan-400',
        glow: 'shadow-[0_0_55px_rgba(34,211,238,0.5)]',
        scale: 'scale-125'
      }
    case 'hold1':
      return {
        title: 'Tahan',
        sub: mode.value === '478'
          ? 'Tahan napasmu selama 7 detik. Jaga bahu dan rahang tetap rileks.'
          : 'Tahan napas dengan tenang, jaga tubuh tetap rileks.',
        color: 'text-indigo-400',
        glow: 'shadow-[0_0_55px_rgba(129,140,248,0.5)]',
        scale: 'scale-125'
      }
    case 'exhale':
      return {
        title: 'Hembuskan',
        sub: mode.value === '478'
          ? 'Hembuskan tuntas perlahan melalui mulut selama 8 detik dengan bunyi desir.'
          : 'Hembuskan napas perlahan melalui mulut, lepaskan seluruh beban ketegangan.',
        color: 'text-purple-400',
        glow: 'shadow-[0_0_35px_rgba(168,85,247,0.35)]',
        scale: 'scale-90'
      }
    case 'hold2':
      return {
        title: 'Tahan Kosong',
        sub: 'Diam dalam ketenangan sebelum siklus berikutnya dimulai.',
        color: 'text-emerald-400',
        glow: 'shadow-[0_0_35px_rgba(52,211,153,0.3)]',
        scale: 'scale-90'
      }
  }
})

const startTimer = () => {
  if (timer) clearInterval(timer)
  isActive.value = true

  timer = setInterval(() => {
    if (secondsLeft.value > 1) {
      secondsLeft.value--
    } else {
      if (mode.value === '478') {
        // 4-7-8 Cycle: Inhale (4s) -> Hold (7s) -> Exhale (8s) -> repeat
        if (phase.value === 'inhale') {
          phase.value = 'hold1'
          secondsLeft.value = phaseDurations.value.hold1
          playCalmingChime(432)
        } else if (phase.value === 'hold1') {
          phase.value = 'exhale'
          secondsLeft.value = phaseDurations.value.exhale
          playCalmingChime(384)
        } else {
          phase.value = 'inhale'
          secondsLeft.value = phaseDurations.value.inhale
          completedCycles.value++
          playCalmingChime(528)
        }
      } else {
        // Box Breathing Cycle: Inhale (4s) -> Hold (4s) -> Exhale (4s) -> Hold (4s)
        if (phase.value === 'inhale') {
          phase.value = 'hold1'
          secondsLeft.value = 4
          playCalmingChime(432)
        } else if (phase.value === 'hold1') {
          phase.value = 'exhale'
          secondsLeft.value = 4
          playCalmingChime(384)
        } else if (phase.value === 'exhale') {
          phase.value = 'hold2'
          secondsLeft.value = 4
          playCalmingChime(320)
        } else {
          phase.value = 'inhale'
          secondsLeft.value = 4
          completedCycles.value++
          playCalmingChime(528)
        }
      }
    }
  }, 1000)
}

const pauseTimer = () => {
  isActive.value = false
  if (timer) clearInterval(timer)
}

const resetTimer = () => {
  pauseTimer()
  phase.value = 'inhale'
  secondsLeft.value = phaseDurations.value.inhale
  completedCycles.value = 0
  startTimer()
}

const switchMode = (newMode: BreathingMode) => {
  mode.value = newMode
  resetTimer()
}

const closeModal = () => {
  if (timer) clearInterval(timer)
  emit('close')
}

onMounted(() => {
  secondsLeft.value = phaseDurations.value.inhale
  startTimer()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
    <div class="relative w-full max-w-md p-6 sm:p-8 rounded-3xl glass-panel text-center shadow-2xl border border-white/15 overflow-hidden">
      <!-- Close Button -->
      <button
        type="button"
        @click="closeModal"
        class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Technique Switcher Tabs -->
      <div class="flex items-center justify-center gap-1.5 p-1 mb-5 bg-white/5 rounded-2xl border border-white/10 max-w-xs mx-auto">
        <button
          type="button"
          @click="switchMode('478')"
          class="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all"
          :class="mode === '478'
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white'"
        >
          Ritme 4-7-8 (PRD)
        </button>
        <button
          type="button"
          @click="switchMode('box')"
          class="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all"
          :class="mode === 'box'
            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white'"
        >
          Box 4-4-4-4
        </button>
      </div>

      <!-- Header Title -->
      <div class="inline-flex items-center gap-2 px-3 py-1 mb-2 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
        <Wind class="w-3.5 h-3.5" />
        <span>{{ mode === '478' ? 'Relaksasi Saraf Mendalam (4-7-8)' : 'Teknik Fokus Box (4-4-4-4)' }}</span>
      </div>

      <h2 class="text-2xl font-bold font-display text-white mb-1">
        {{ mode === '478' ? 'Latihan Pernapasan 4-7-8' : 'Box Breathing' }}
      </h2>
      <p class="text-xs text-slate-300 mb-6 max-w-xs mx-auto">
        {{ mode === '478'
          ? 'Metode klinis aktivasi saraf parasimpatis: Tarik 4d, Tahan 7d, Hembuskan 8d untuk meredakan cemas mendalam.'
          : 'Metode pernapasan simetris 4-4-4-4 untuk menjernihkan pikiran dan mengatur ritme detak jantung.' }}
      </p>

      <!-- Breathing Orb Visualizer -->
      <div class="relative w-48 h-48 mx-auto mb-6 flex items-center justify-center">
        <!-- Outer Target Ring -->
        <div class="absolute inset-0 rounded-full border border-dashed border-cyan-500/30 animate-spin" style="animation-duration: 24s;" />

        <!-- Pulsating Breathing Sphere -->
        <div
          class="w-36 h-36 rounded-full bg-gradient-to-tr from-cyan-500/40 via-indigo-500/40 to-purple-500/40 backdrop-blur-md border border-cyan-400/40 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out"
          :class="[phaseDetails.glow, phaseDetails.scale]"
        >
          <span class="text-4xl font-extrabold text-white font-display">
            {{ secondsLeft }}
          </span>
          <span class="text-xs font-semibold uppercase tracking-wider mt-1" :class="phaseDetails.color">
            {{ phaseDetails.title }}
          </span>
        </div>
      </div>

      <!-- Description Guidance -->
      <p class="text-xs text-slate-300 mb-6 h-10 flex items-center justify-center px-4">
        {{ phaseDetails.sub }}
      </p>

      <!-- Stats & Controls -->
      <div class="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-slate-300">
        <div>
          <span>Siklus Selesai: </span>
          <strong class="text-white">{{ completedCycles }}</strong>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="isActive ? pauseTimer() : startTimer()"
            class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            :title="isActive ? 'Jeda' : 'Lanjutkan'"
          >
            <Square v-if="isActive" class="w-4 h-4 fill-white" />
            <Play v-else class="w-4 h-4 fill-white" />
          </button>

          <button
            type="button"
            @click="resetTimer"
            class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Ulangi Siklus"
          >
            <RotateCcw class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
