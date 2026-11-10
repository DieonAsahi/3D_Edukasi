<script setup lang="ts">
import { computed } from 'vue'
import {
  Wind,
  CheckSquare,
  SmilePlus,
  LogOut,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2
} from 'lucide-vue-next'
import { useAuraAuth } from '~/composables/useAuraAuth'
import { useCharacterState } from '~/composables/useCharacterState'

const emit = defineEmits<{
  (e: 'open-breathing'): void
  (e: 'open-productivity'): void
  (e: 'open-mood'): void
}>()

const { currentUser, isGuest, isAuthenticated, authToast, linkGuestToGoogle, signOut } = useAuraAuth()
const { characterState } = useCharacterState()

const statusLabel = computed(() => {
  switch (characterState.value) {
    case 'listening': return 'Mendengarkan'
    case 'thinking': return 'Berpikir'
    case 'talking': return 'Berbicara'
    default: return 'Online'
  }
})

const statusDotClass = computed(() => {
  switch (characterState.value) {
    case 'listening': return 'bg-emerald-400 animate-ping'
    case 'thinking': return 'bg-amber-400 animate-spin'
    case 'talking': return 'bg-purple-400 animate-pulse'
    default: return 'bg-emerald-400'
  }
})
</script>

<template>
  <div class="w-full z-30 sticky top-0">
    <header class="w-full glass-panel border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <!-- Brand / Logo -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-0.5 shadow-lg shadow-purple-500/20 flex items-center justify-center">
          <div class="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
            <Sparkles class="w-5 h-5 text-purple-300" />
          </div>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-display font-bold text-lg text-white tracking-tight">Ara</span>
            <span class="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              3D CBT Companion
            </span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-slate-400">
            <span class="w-2 h-2 rounded-full" :class="statusDotClass" />
            <span class="capitalize">{{ statusLabel }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Tool Shortcuts (Desktop) -->
      <div class="hidden md:flex items-center gap-2">
        <button
          type="button"
          @click="emit('open-breathing')"
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm group"
        >
          <Wind class="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>Pernapasan 4-7-8</span>
        </button>

        <button
          type="button"
          @click="emit('open-productivity')"
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm group"
        >
          <CheckSquare class="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Pomodoro & Tugas</span>
        </button>

        <button
          type="button"
          @click="emit('open-mood')"
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm group"
        >
          <SmilePlus class="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Catat Mood</span>
        </button>
      </div>

      <!-- User Profile & Actions -->
      <div class="flex items-center gap-3" v-if="isAuthenticated">
        <!-- Guest Link to Google CTA -->
        <button
          v-if="isGuest"
          type="button"
          @click="linkGuestToGoogle"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20 active:scale-95 transition-all"
          title="Tautkan akun tamu ke Google agar riwayat tersimpan permanen"
        >
          <LinkIcon class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Simpan Sesi (Tautkan ke Google)</span>
          <span class="sm:hidden">Tautkan</span>
        </button>

        <!-- User Info Badge -->
        <div class="flex items-center gap-2.5 pl-2 border-l border-white/10">
          <div class="w-8 h-8 rounded-full bg-slate-800 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
            <img
              v-if="currentUser?.avatarUrl"
              :src="currentUser.avatarUrl"
              :alt="currentUser.displayName"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-xs font-bold text-purple-300">
              {{ currentUser?.displayName?.charAt(0) || 'A' }}
            </span>
          </div>

          <div class="hidden sm:block text-left">
            <p class="text-xs font-medium text-slate-200 truncate max-w-[180px]">
              {{ currentUser?.displayName }}
            </p>
            <span v-if="isGuest" class="text-[10px] text-amber-400 font-medium">Mode Tamu Lokal</span>
            <span v-else class="text-[10px] text-emerald-400 font-medium">
              {{ currentUser?.email || 'Google Terverifikasi' }}
            </span>
          </div>

          <!-- Sign Out Button -->
          <button
            type="button"
            @click="signOut"
            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
            title="Keluar"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Quick Shortcuts Row -->
    <div v-if="isAuthenticated" class="md:hidden flex items-center justify-center gap-2 px-3 py-2 glass-card border-b border-white/5">
      <button
        type="button"
        @click="emit('open-breathing')"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/70 border border-white/10 text-[11px] font-medium text-slate-200"
      >
        <Wind class="w-3.5 h-3.5 text-cyan-400" />
        <span>4-7-8</span>
      </button>
      <button
        type="button"
        @click="emit('open-productivity')"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/70 border border-white/10 text-[11px] font-medium text-slate-200"
      >
        <CheckSquare class="w-3.5 h-3.5 text-emerald-400" />
        <span>Pomodoro</span>
      </button>
      <button
        type="button"
        @click="emit('open-mood')"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/70 border border-white/10 text-[11px] font-medium text-slate-200"
      >
        <SmilePlus class="w-3.5 h-3.5 text-amber-400" />
        <span>Mood</span>
      </button>
    </div>

    <!-- Non-blocking Account Conversion Toast -->
    <div
      v-if="authToast"
      class="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600/95 text-white text-xs font-semibold shadow-xl border border-emerald-400/50 backdrop-blur-md animate-bounce"
    >
      <CheckCircle2 class="w-4 h-4 shrink-0" />
      <span>{{ authToast }}</span>
    </div>
  </div>
</template>
