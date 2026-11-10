<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuraAuth } from '~/composables/useAuraAuth'
import { useVoiceRegistry } from '~/composables/useVoiceRegistry'
import { Heart, Sparkles, MessageSquare } from 'lucide-vue-next'

const { isAuthenticated, isAuthChecking, initAuth } = useAuraAuth()
const { initVoiceRegistry } = useVoiceRegistry()

// Modals state
const isBreathingModalOpen = ref(false)
const isProductivityModalOpen = ref(false)
const isMoodModalOpen = ref(false)
const activeProductivityTask = ref<{ title: string; duration_minutes: number } | null>(null)

// Mobile viewport tab toggle ('scene' | 'chat')
const mobileActiveTab = ref<'scene' | 'chat'>('chat')

const openBreathing = () => {
  isBreathingModalOpen.value = true
}

const openProductivity = (task?: { title: string; duration_minutes: number }) => {
  activeProductivityTask.value = task || null
  isProductivityModalOpen.value = true
}

const openMood = () => {
  isMoodModalOpen.value = true
}

onMounted(() => {
  initAuth()
  initVoiceRegistry()
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans">
    <!-- Background Ambient Glow Orbs -->
    <div class="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none -z-10" />
    <div class="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none -z-10" />

    <!-- Top Header Bar -->
    <HeaderBar
      @open-breathing="openBreathing"
      @open-productivity="() => openProductivity()"
      @open-mood="openMood"
    />

    <!-- Mobile Viewport Switcher Tabs (Only visible on small screens) -->
    <div class="lg:hidden px-4 pt-3 pb-1 max-w-md mx-auto w-full z-20">
      <div class="flex items-center p-1 rounded-2xl glass-card border border-white/10">
        <button
          type="button"
          @click="mobileActiveTab = 'scene'"
          class="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          :class="mobileActiveTab === 'scene'
            ? 'bg-purple-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white'"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>Karakter 3D</span>
        </button>
        <button
          type="button"
          @click="mobileActiveTab = 'chat'"
          class="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          :class="mobileActiveTab === 'chat'
            ? 'bg-purple-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white'"
        >
          <MessageSquare class="w-3.5 h-3.5" />
          <span>Chat & Konseling</span>
        </button>
      </div>
    </div>

    <!-- Main Workspace -->
    <main class="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 flex flex-col lg:flex-row gap-6 relative z-10">
      <!-- 3D Aura Character Canvas Column -->
      <section
        class="w-full lg:w-1/2 flex flex-col justify-center items-center relative min-h-[380px] lg:min-h-0"
        :class="mobileActiveTab === 'scene' ? 'block' : 'hidden lg:flex'"
      >
        <ClientOnly>
          <AuraScene />
          <template #fallback>
            <div class="flex flex-col items-center justify-center p-8 text-purple-300">
              <div class="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p class="text-xs font-medium mt-3">Memuat Karakter 3D...</p>
            </div>
          </template>
        </ClientOnly>
      </section>

      <!-- Chat & Voice Interaction Column -->
      <section
        class="w-full lg:w-1/2 flex flex-col h-[580px] lg:h-[calc(100vh-140px)] max-h-[820px]"
        :class="mobileActiveTab === 'chat' ? 'flex' : 'hidden lg:flex'"
      >
        <ChatPanel
          @trigger-breathing="openBreathing"
          @trigger-productivity="(task) => openProductivity(task)"
        />
      </section>
    </main>

    <!-- Bottom Footer (SDG 3 Recognition) -->
    <footer class="w-full py-2.5 px-4 text-center border-t border-white/5 glass-panel text-[11px] text-slate-400 flex items-center justify-center gap-2">
      <Heart class="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
      <span>
        <strong>Ara Virtual Companion</strong> &bull; Mendukung <strong>SDG 3: Good Health & Well-being</strong> melalui CBT ringan & produktivitas sehat.
      </span>
    </footer>

    <!-- Initial Auth Gate Overlay (Google Login vs Guest Mode) -->
    <AuthGateOverlay v-if="!isAuthChecking && !isAuthenticated" />

    <!-- Interactive Intervention Modals -->
    <BoxBreathingModal
      v-if="isBreathingModalOpen"
      @close="isBreathingModalOpen = false"
    />

    <ProductivityModal
      v-if="isProductivityModalOpen"
      :initial-task="activeProductivityTask"
      @close="isProductivityModalOpen = false"
    />

    <MoodLoggerModal
      v-if="isMoodModalOpen"
      @close="isMoodModalOpen = false"
    />
  </div>
</template>
