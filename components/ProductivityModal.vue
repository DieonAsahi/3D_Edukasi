<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { CheckSquare, X, Play, Pause, RotateCcw, Plus, Trash2, CheckCircle2 } from 'lucide-vue-next'
import { useAuraAuth } from '~/composables/useAuraAuth'
import { useAuraSeed } from '~/composables/useAuraSeed'
import { useAcousticFeedback } from '~/composables/useAcousticFeedback'

const props = defineProps<{
  initialTask?: {
    title: string
    duration_minutes: number
  } | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { currentUser, isGuest, isSupabaseConfigured } = useAuraAuth()
const { ensureSeedData } = useAuraSeed()
const { playSuccessChime } = useAcousticFeedback()
const supabase = useSupabaseClient()

interface TaskItem {
  id: string
  title: string
  duration_minutes: number
  is_completed: boolean
}

// Timer state
const selectedDuration = ref(props.initialTask?.duration_minutes || 25)
const timeLeftSeconds = ref(selectedDuration.value * 60)
const isTimerRunning = ref(false)
let timerInterval: any = null

// Tasks state
const tasks = ref<TaskItem[]>([])
const newTaskTitle = ref(props.initialTask?.title || '')

const formattedTime = computed(() => {
  const mins = Math.floor(timeLeftSeconds.value / 60)
  const secs = timeLeftSeconds.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const timerProgress = computed(() => {
  const total = selectedDuration.value * 60
  return ((total - timeLeftSeconds.value) / total) * 100
})

const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  isTimerRunning.value = true

  timerInterval = setInterval(() => {
    if (timeLeftSeconds.value > 0) {
      timeLeftSeconds.value--
    } else {
      pauseTimer()
      playSuccessChime()
      alert('Sesi Pomodoro selesai! Berikan dirimu istirahat 5 menit.')
    }
  }, 1000)
}

const pauseTimer = () => {
  isTimerRunning.value = false
  if (timerInterval) clearInterval(timerInterval)
}

const resetTimer = () => {
  pauseTimer()
  timeLeftSeconds.value = selectedDuration.value * 60
}

const setDuration = (minutes: number) => {
  selectedDuration.value = minutes
  resetTimer()
}

// Load tasks from Supabase or localStorage
const loadTasks = async () => {
  ensureSeedData()
  if (isSupabaseConfigured.value && currentUser.value?.id && !isGuest.value) {
    try {
      const { data } = await supabase
        .from('productivity_tasks')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) {
        tasks.value = data
        return
      }
    } catch (e) {
      console.warn('Failed loading tasks from Supabase:', e)
    }
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('aura_productivity_tasks')
      if (stored) {
        tasks.value = JSON.parse(stored)
      }
    } catch {}
  }
}

const saveLocalTasks = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('aura_productivity_tasks', JSON.stringify(tasks.value))
  }
}

const addTask = async () => {
  const title = newTaskTitle.value.trim()
  if (!title) return

  const newTask: TaskItem = {
    id: 'task_' + Date.now(),
    title,
    duration_minutes: selectedDuration.value,
    is_completed: false
  }

  tasks.value.unshift(newTask)
  newTaskTitle.value = ''
  saveLocalTasks()

  if (isSupabaseConfigured.value && currentUser.value?.id && !isGuest.value) {
    try {
      await supabase.from('productivity_tasks').insert({
        user_id: currentUser.value.id,
        title: newTask.title,
        duration_minutes: newTask.duration_minutes,
        is_completed: false
      })
    } catch (e) {
      console.warn('Failed saving task to Supabase:', e)
    }
  }
}

const toggleTask = async (task: TaskItem) => {
  task.is_completed = !task.is_completed
  saveLocalTasks()

  if (isSupabaseConfigured.value && currentUser.value?.id && !isGuest.value) {
    try {
      await supabase
        .from('productivity_tasks')
        .update({ is_completed: task.is_completed })
        .eq('id', task.id)
    } catch (e) {
      console.warn('Failed updating task in Supabase:', e)
    }
  }
}

const deleteTask = async (taskId: string) => {
  tasks.value = tasks.value.filter(t => t.id !== taskId)
  saveLocalTasks()

  if (isSupabaseConfigured.value && currentUser.value?.id && !isGuest.value) {
    try {
      await supabase.from('productivity_tasks').delete().eq('id', taskId)
    } catch (e) {
      console.warn('Failed deleting task from Supabase:', e)
    }
  }
}

watch(() => props.initialTask, (val) => {
  if (val?.title) {
    newTaskTitle.value = val.title
    if (val.duration_minutes) {
      setDuration(val.duration_minutes)
    }
  }
}, { immediate: true })

const closeModal = () => {
  if (timerInterval) clearInterval(timerInterval)
  emit('close')
}

onMounted(() => {
  loadTasks()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
    <div class="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl glass-panel shadow-2xl border border-white/15 overflow-hidden">
      <!-- Close Button -->
      <button
        type="button"
        @click="closeModal"
        class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Header -->
      <div class="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
        <CheckSquare class="w-3.5 h-3.5" />
        <span>Time-Blocking & Pomodoro</span>
      </div>

      <h2 class="text-2xl font-bold font-display text-white mb-1">
        Fokus & Manajemen Tugas
      </h2>
      <p class="text-xs text-slate-300 mb-6">
        Kurangi beban kognitif dengan memecah pekerjaan ke dalam interval fokus terarah.
      </p>

      <!-- Timer Card -->
      <div class="p-6 rounded-2xl glass-card border border-white/10 text-center mb-6 relative overflow-hidden">
        <!-- Progress Bar Background -->
        <div
          class="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000"
          :style="{ width: `${timerProgress}%` }"
        />

        <!-- Preset buttons -->
        <div class="flex justify-center gap-2 mb-4">
          <button
            v-for="mins in [15, 25, 45]"
            :key="mins"
            type="button"
            @click="setDuration(mins)"
            class="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            :class="selectedDuration === mins
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'"
          >
            {{ mins }} Menit
          </button>
        </div>

        <div class="text-5xl font-extrabold font-display text-white tracking-wider mb-4">
          {{ formattedTime }}
        </div>

        <div class="flex items-center justify-center gap-3">
          <button
            type="button"
            @click="isTimerRunning ? pauseTimer() : startTimer()"
            class="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-lg active:scale-95"
            :class="isTimerRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'"
          >
            <Pause v-if="isTimerRunning" class="w-4 h-4" />
            <Play v-else class="w-4 h-4 fill-current" />
            <span>{{ isTimerRunning ? 'Jeda Fokus' : 'Mulai Fokus' }}</span>
          </button>

          <button
            type="button"
            @click="resetTimer"
            class="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Reset Timer"
          >
            <RotateCcw class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Add Task Input -->
      <form @submit.prevent="addTask" class="flex gap-2 mb-4">
        <input
          v-model="newTaskTitle"
          type="text"
          placeholder="Tulis tugas fokus yang ingin diselesaikan..."
          class="flex-1 px-4 py-2 rounded-xl glass-input text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          :disabled="!newTaskTitle.trim()"
          class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus class="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </form>

      <!-- Tasks List -->
      <div class="max-h-48 overflow-y-auto space-y-2 pr-1">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="flex items-center justify-between p-3 rounded-xl glass-card border border-white/5 hover:border-white/15 transition-all text-xs"
        >
          <button
            type="button"
            @click="toggleTask(task)"
            class="flex items-center gap-2.5 text-left flex-1"
          >
            <CheckCircle2
              class="w-4 h-4 shrink-0 transition-colors"
              :class="task.is_completed ? 'text-emerald-400 fill-emerald-400/20' : 'text-slate-500'"
            />
            <span
              :class="task.is_completed ? 'line-through text-slate-400' : 'text-slate-200 font-medium'"
            >
              {{ task.title }}
            </span>
          </button>

          <div class="flex items-center gap-2">
            <span class="text-[10px] text-slate-400">{{ task.duration_minutes }}m</span>
            <button
              type="button"
              @click="deleteTask(task.id)"
              class="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p v-if="tasks.length === 0" class="text-center text-xs text-slate-500 py-3">
          Belum ada tugas fokus. Tambahkan satu untuk memulai.
        </p>
      </div>
    </div>
  </div>
</template>

