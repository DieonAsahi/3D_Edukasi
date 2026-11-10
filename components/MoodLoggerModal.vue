<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SmilePlus, X, Check, History, Sparkles } from 'lucide-vue-next'
import { useAuraAuth } from '~/composables/useAuraAuth'
import { useAuraSeed } from '~/composables/useAuraSeed'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'logged'): void
}>()

const { currentUser, isGuest, isSupabaseConfigured } = useAuraAuth()
const { ensureSeedData } = useAuraSeed()
const supabase = useSupabaseClient()

interface MoodLogRecord {
  mood_score: number
  stress_level: 'low' | 'medium' | 'high'
  note: string
  created_at: string
}

const moodScore = ref<number>(3)
const stressLevel = ref<'low' | 'medium' | 'high'>('medium')
const note = ref('')
const isSaving = ref(false)
const isSaved = ref(false)
const moodHistory = ref<MoodLogRecord[]>([])

const moodOptions = [
  { score: 1, emoji: '😔', label: 'Sangat Buruk' },
  { score: 2, emoji: '😕', label: 'Kurang Baik' },
  { score: 3, emoji: '😐', label: 'Biasa Saja' },
  { score: 4, emoji: '🙂', label: 'Cukup Baik' },
  { score: 5, emoji: '😊', label: 'Sangat Baik' }
]

const stressOptions: Array<{ level: 'low' | 'medium' | 'high'; label: string; color: string }> = [
  { level: 'low', label: 'Rendah (Tenang)', color: 'border-emerald-500/40 text-emerald-300' },
  { level: 'medium', label: 'Sedang (Terkendali)', color: 'border-amber-500/40 text-amber-300' },
  { level: 'high', label: 'Tinggi (Kewalahan)', color: 'border-rose-500/40 text-rose-300' }
]

const getEmojiForScore = (score: number) => {
  return moodOptions.find(m => m.score === score)?.emoji || '😐'
}

const formatDate = (isoDate: string) => {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

const loadMoodHistory = async () => {
  ensureSeedData()

  if (isSupabaseConfigured.value && currentUser.value?.id && !isGuest.value) {
    try {
      const { data } = await supabase
        .from('mood_logs')
        .select('*')
        .order('created_at', { ascending: false })
      if (data && data.length > 0) {
        moodHistory.value = data as MoodLogRecord[]
        return
      }
    } catch (e) {
      console.warn('Failed loading mood logs from Supabase:', e)
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('aura_mood_logs')
      if (stored) {
        moodHistory.value = JSON.parse(stored)
      }
    } catch {}
  }
}

const saveMood = async () => {
  isSaving.value = true

  const record: MoodLogRecord = {
    mood_score: moodScore.value,
    stress_level: stressLevel.value,
    note: note.value.trim(),
    created_at: new Date().toISOString()
  }

  if (isSupabaseConfigured.value && currentUser.value?.id && !isGuest.value) {
    try {
      await supabase.from('mood_logs').insert({
        user_id: currentUser.value.id,
        ...record
      })
    } catch (e) {
      console.warn('Failed saving mood log to Supabase:', e)
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const logs = JSON.parse(localStorage.getItem('aura_mood_logs') || '[]')
      logs.unshift(record)
      localStorage.setItem('aura_mood_logs', JSON.stringify(logs))
      moodHistory.value = logs
    } catch {}
  }

  isSaving.value = false
  isSaved.value = true

  setTimeout(() => {
    isSaved.value = false
    note.value = ''
    emit('logged')
  }, 1000)
}

onMounted(() => {
  loadMoodHistory()
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
    <div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl glass-panel shadow-2xl border border-white/15">
      <!-- Close Button -->
      <button
        type="button"
        @click="emit('close')"
        class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Header -->
      <div class="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
        <SmilePlus class="w-3.5 h-3.5" />
        <span>Pelacak Suasana Hati</span>
      </div>

      <h2 class="text-2xl font-bold font-display text-white mb-1">
        Bagaimana Perasaanmu?
      </h2>
      <p class="text-xs text-slate-300 mb-5">
        Mengenali emosi secara berkala adalah langkah awal kesehatan mental yang berkelanjutan (SDG 3).
      </p>

      <!-- Mood Score Selection -->
      <div class="mb-5">
        <label class="block text-xs font-semibold text-slate-200 mb-2">Pilih Skala Emosi (1 - 5):</label>
        <div class="grid grid-cols-5 gap-2">
          <button
            v-for="opt in moodOptions"
            :key="opt.score"
            type="button"
            @click="moodScore = opt.score"
            class="p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all duration-200"
            :class="moodScore === opt.score
              ? 'bg-purple-600/30 border-2 border-purple-500 shadow-lg shadow-purple-600/30 scale-105'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'"
          >
            <span class="text-2xl mb-0.5">{{ opt.emoji }}</span>
            <span class="text-[10px] text-slate-300 font-medium text-center leading-tight">{{ opt.score }}</span>
          </button>
        </div>
      </div>

      <!-- Stress Level Selection -->
      <div class="mb-5">
        <label class="block text-xs font-semibold text-slate-200 mb-2">Tingkat Stres Saat Ini:</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="st in stressOptions"
            :key="st.level"
            type="button"
            @click="stressLevel = st.level"
            class="py-2 px-2 rounded-xl border text-[11px] font-semibold text-center transition-all"
            :class="stressLevel === st.level
              ? `${st.color} bg-white/15 ring-2 ring-white/20`
              : 'border-white/10 text-slate-400 bg-white/5 hover:bg-white/10'"
          >
            {{ st.label }}
          </button>
        </div>
      </div>

      <!-- Note Textarea -->
      <div class="mb-5">
        <label class="block text-xs font-semibold text-slate-200 mb-1.5">Catatan Refleksi Singkat (Opsional):</label>
        <textarea
          v-model="note"
          rows="2"
          placeholder="Ada peristiwa atau pikiran tertentu yang mempengaruhimu hari ini?..."
          class="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      <!-- Submit Button -->
      <button
        type="button"
        :disabled="isSaving || isSaved"
        @click="saveMood"
        class="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-98 font-bold text-slate-950 text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/25 mb-6"
      >
        <Check v-if="isSaved" class="w-4 h-4 text-slate-950" />
        <span>{{ isSaved ? 'Tersimpan dengan Baik!' : (isSaving ? 'Menyimpan...' : 'Simpan Refleksi Emosi') }}</span>
      </button>

      <!-- Mood History Section (Displays Seeded & New Records) -->
      <div class="pt-4 border-t border-white/10">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <History class="w-3.5 h-3.5 text-amber-400" />
            <span>Riwayat Mood Sebelumnya ({{ moodHistory.length }})</span>
          </div>
          <span class="text-[10px] text-slate-400 flex items-center gap-1">
            <Sparkles class="w-3 h-3 text-purple-400" /> Refleksi Harian
          </span>
        </div>

        <div class="space-y-2 max-h-44 overflow-y-auto pr-1">
          <div
            v-for="(item, idx) in moodHistory"
            :key="idx"
            class="p-3 rounded-xl glass-card border border-white/5 flex items-start gap-3 text-left"
          >
            <div class="text-2xl shrink-0 leading-none pt-0.5">
              {{ getEmojiForScore(item.mood_score) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-white">Skala {{ item.mood_score }}/5</span>
                  <span
                    class="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                    :class="item.stress_level === 'high'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : (item.stress_level === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')"
                  >
                    Stres {{ item.stress_level }}
                  </span>
                </div>
                <span class="text-[10px] text-slate-400 shrink-0">{{ formatDate(item.created_at) }}</span>
              </div>
              <p v-if="item.note" class="text-[11px] text-slate-300 leading-snug">
                "{{ item.note }}"
              </p>
              <p v-else class="text-[11px] text-slate-500 italic">
                Tidak ada catatan tambahan.
              </p>
            </div>
          </div>

          <p v-if="moodHistory.length === 0" class="text-center text-xs text-slate-500 py-3">
            Belum ada catatan mood.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
