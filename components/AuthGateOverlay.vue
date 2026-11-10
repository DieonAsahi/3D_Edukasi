<script setup lang="ts">
import { ref } from 'vue'
import { Sparkles, ShieldCheck, Heart, UserX, ArrowRight } from 'lucide-vue-next'
import { useAuraAuth } from '~/composables/useAuraAuth'

const { signInWithGoogle, signInAsGuest } = useAuraAuth()

const isLoadingGoogle = ref(false)
const isLoadingGuest = ref(false)

const handleGoogleLogin = async () => {
  isLoadingGoogle.value = true
  try {
    await signInWithGoogle()
  } finally {
    isLoadingGoogle.value = false
  }
}

const handleGuestLogin = async () => {
  isLoadingGuest.value = true
  try {
    await signInAsGuest()
  } finally {
    isLoadingGuest.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md transition-all duration-300">
    <!-- Center Glass Card -->
    <div class="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl glass-panel text-center shadow-2xl border border-white/15 overflow-hidden animate-float">
      <!-- Glow Accent Background -->
      <div class="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <!-- SDG 3 Badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide">
        <Heart class="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
        <span>SDG 3: Good Health & Well-being</span>
      </div>

      <!-- App Title & Tagline -->
      <h1 class="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white mb-2">
        Ara <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300">Companion</span>
      </h1>
      <p class="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
        Sahabat 3D virtual berbasis AI dengan prinsip CBT ringan untuk meredakan kecemasan, mengelola stres, dan menata produktivitas harianmu.
      </p>

      <!-- Security / Privacy Highlights -->
      <div class="grid grid-cols-2 gap-3 mb-6 text-left">
        <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-2.5">
          <ShieldCheck class="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
          <div>
            <p class="text-xs font-semibold text-slate-200">100% Privat & Aman</p>
            <p class="text-[11px] text-slate-400">Data sesi curhat tersimpan aman dan terenkripsi.</p>
          </div>
        </div>
        <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-2.5">
          <Sparkles class="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p class="text-xs font-semibold text-slate-200">Prinsip CBT Empatik</p>
            <p class="text-[11px] text-slate-400">Validasi emosi, reframing, dan teknik relaksasi.</p>
          </div>
        </div>
      </div>

      <!-- 2 Main Action Buttons -->
      <div class="space-y-3">
        <!-- Google OAuth Button -->
        <button
          type="button"
          :disabled="isLoadingGoogle || isLoadingGuest"
          @click="handleGoogleLogin"
          class="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-white/10 disabled:opacity-50"
        >
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{{ isLoadingGoogle ? 'Menghubungkan...' : 'Lanjutkan dengan Google' }}</span>
        </button>

        <!-- Guest Mode Button -->
        <button
          type="button"
          :disabled="isLoadingGoogle || isLoadingGuest"
          @click="handleGuestLogin"
          class="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-50 group"
        >
          <UserX class="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
          <span>{{ isLoadingGuest ? 'Membuat sesi tamu...' : 'Masuk sebagai Tamu (Anonim)' }}</span>
          <ArrowRight class="w-4 h-4 ml-auto text-slate-500 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <!-- Footer Privacy Assurance -->
      <p class="mt-5 text-[11px] text-slate-400">
        Mode Tamu tidak memerlukan akun atau email. Kamu dapat menautkan akun ke Google kapan saja untuk menyimpan riwayat.
      </p>
    </div>
  </div>
</template>

