export const useAuraSeed = () => {
  const ensureSeedData = () => {
    if (typeof window === 'undefined') return

    try {
      // 1. Seed Chat Messages if empty
      const existingChats = localStorage.getItem('aura_local_chat_messages')
      if (!existingChats || existingChats === '[]') {
        const now = Date.now()
        const seedChats = [
          {
            id: 'seed_chat_1',
            role: 'assistant',
            content: 'Halo! Aku Ara, sahabat virtualmu. Aku siap mendengarkan ceritamu hari ini tanpa menghakimi. Bagaimana perasaanmu saat ini?',
            emotion_detected: 'neutral',
            stress_level: 'low',
            suggested_intervention: 'none',
            action_triggered: 'none',
            timestamp: new Date(now - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            created_at: new Date(now - 3600000).toISOString()
          },
          {
            id: 'seed_chat_2',
            role: 'user',
            content: 'Akhir-akhir ini aku merasa agak lelah membagi waktu antara revisi skripsi dan persiapan presentasi minggu depan.',
            action_triggered: 'none',
            timestamp: new Date(now - 3500000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            created_at: new Date(now - 3500000).toISOString()
          },
          {
            id: 'seed_chat_3',
            role: 'assistant',
            content: 'Wajar sekali merasa kewalahan saat dua tanggung jawab besar datang bersamaan. Kamu sudah berusaha keras sejauh ini. Bagaimana kalau kita pecah menjadi langkah kecil dengan satu blok fokus 25 menit saja untuk Bab 1?',
            emotion_detected: 'tired',
            stress_level: 'medium',
            suggested_intervention: 'time_blocking',
            recommended_task: {
              title: 'Menyusun Bab 1 Skripsi',
              duration_minutes: 25
            },
            action_triggered: 'pomodoro',
            timestamp: new Date(now - 3400000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            created_at: new Date(now - 3400000).toISOString()
          }
        ]
        localStorage.setItem('aura_local_chat_messages', JSON.stringify(seedChats))
      }

      // 2. Seed Mood Logs if empty
      const existingMoods = localStorage.getItem('aura_mood_logs')
      if (!existingMoods || existingMoods === '[]') {
        const dayMs = 86400000
        const now = Date.now()
        const seedMoods = [
          {
            mood_score: 4,
            stress_level: 'low',
            note: 'Selesai olahraga pagi dan meditasi 4-7-8, pikiran terasa jauh lebih jernih.',
            created_at: new Date(now - dayMs * 1).toISOString()
          },
          {
            mood_score: 3,
            stress_level: 'medium',
            note: 'Lumayan sibuk mengejar jadwal bimbingan, tapi masih terkendali dengan Pomodoro.',
            created_at: new Date(now - dayMs * 2).toISOString()
          },
          {
            mood_score: 2,
            stress_level: 'high',
            note: 'Sempat overthinking soal deadline malam hari sebelum akhirnya curhat ke Ara.',
            created_at: new Date(now - dayMs * 3).toISOString()
          },
          {
            mood_score: 4,
            stress_level: 'low',
            note: 'Berhasil menyelesaikan draft outline presentasi tepat waktu.',
            created_at: new Date(now - dayMs * 4).toISOString()
          }
        ]
        localStorage.setItem('aura_mood_logs', JSON.stringify(seedMoods))
      }

      // 3. Seed Productivity Tasks if empty
      const existingTasks = localStorage.getItem('aura_productivity_tasks')
      if (!existingTasks || existingTasks === '[]') {
        const seedTasks = [
          {
            id: 'seed_task_1',
            title: 'Menyusun Bab 1 Skripsi',
            duration_minutes: 25,
            is_completed: false
          },
          {
            id: 'seed_task_2',
            title: 'Review materi presentasi',
            duration_minutes: 15,
            is_completed: false
          }
        ]
        localStorage.setItem('aura_productivity_tasks', JSON.stringify(seedTasks))
      }
    } catch (e) {
      console.warn('Could not seed dummy data:', e)
    }
  }

  return {
    ensureSeedData
  }
}

