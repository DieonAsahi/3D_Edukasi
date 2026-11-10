import { computed } from 'vue'
import { useAuraSeed } from './useAuraSeed'

export interface AuraUser {
  id: string
  displayName: string
  email?: string
  isGuest: boolean
  avatarUrl?: string
}

export const useAuraAuth = () => {
  const config = useRuntimeConfig()
  const { ensureSeedData } = useAuraSeed()
  const supabaseUrl = (config.public?.supabaseUrl || '') as string

  // Check whether genuine Supabase credentials are active
  const isSupabaseConfigured = computed<boolean>(() => {
    return Boolean(
      !config.public?.isDummyMode &&
      supabaseUrl &&
      !supabaseUrl.includes('placeholder-project') &&
      !supabaseUrl.includes('your-project')
    )
  })

  // Safe wrappers (resolved to @nuxtjs/supabase if configured, or useSupabaseMock if in Dummy Mode)
  const supabase = useSupabaseClient()
  const supabaseUser = useSupabaseUser()

  const guestUser = useState<AuraUser | null>('aura_guest_user', () => null)
  const dummyGoogleUser = useState<AuraUser | null>('aura_dummy_google_user', () => null)
  const authToast = useState<string | null>('aura_auth_toast', () => null)
  const isAuthModalOpen = useState<boolean>('aura_auth_modal_open', () => false)
  const isAuthChecking = useState<boolean>('aura_auth_checking', () => true)

  const showToast = (msg: string) => {
    authToast.value = msg
    setTimeout(() => {
      if (authToast.value === msg) {
        authToast.value = null
      }
    }, 4500)
  }

  // Migrate guest data from localStorage to real Supabase PostgreSQL
  const migrateGuestDataToSupabase = async (userId: string) => {
    if (typeof window === 'undefined' || !isSupabaseConfigured.value) return
    try {
      console.info('Migrating local guest data to Supabase user:', userId)

      const rawMoods = localStorage.getItem('aura_mood_logs')
      if (rawMoods) {
        const moods = JSON.parse(rawMoods)
        if (Array.isArray(moods) && moods.length > 0) {
          const rows = moods.map(m => ({
            user_id: userId,
            mood_score: m.mood_score,
            stress_level: m.stress_level,
            note: m.note || '',
            created_at: m.created_at || new Date().toISOString()
          }))
          await supabase.from('mood_logs').insert(rows)
        }
      }

      const rawTasks = localStorage.getItem('aura_productivity_tasks')
      if (rawTasks) {
        const tasks = JSON.parse(rawTasks)
        if (Array.isArray(tasks) && tasks.length > 0) {
          const rows = tasks.map(t => ({
            user_id: userId,
            title: t.title,
            duration_minutes: t.duration_minutes || 25,
            is_completed: Boolean(t.is_completed)
          }))
          await supabase.from('productivity_tasks').insert(rows)
        }
      }

      const rawChats = localStorage.getItem('aura_local_chat_messages')
      if (rawChats) {
        const chats = JSON.parse(rawChats)
        if (Array.isArray(chats) && chats.length > 0) {
          const rows = chats.map(c => ({
            user_id: userId,
            role: c.role,
            content: c.content,
            action_triggered: c.action_triggered || 'none',
            created_at: c.created_at || new Date().toISOString()
          }))
          await supabase.from('chat_messages').insert(rows)
        }
      }

      localStorage.removeItem('aura_mood_logs')
      localStorage.removeItem('aura_productivity_tasks')
      localStorage.removeItem('aura_local_chat_messages')
      localStorage.removeItem('aura_pending_guest_migration')
      localStorage.removeItem('aura_guest_session')
      console.info('Guest data migration to Supabase completed successfully.')
    } catch (err) {
      console.warn('Error during guest data migration:', err)
    }
  }

  // Initialize auth state & seed initial dummy data if empty
  const initAuth = async () => {
    if (typeof window === 'undefined') return

    // Pre-populate realistic dummy seed data if localStorage is empty
    ensureSeedData()

    if (isSupabaseConfigured.value && supabaseUser.value) {
      const pendingMigration = localStorage.getItem('aura_pending_guest_migration')
      if (pendingMigration === 'true') {
        await migrateGuestDataToSupabase(supabaseUser.value.id)
      }
      isAuthChecking.value = false
      return
    }

    try {
      const storedDummyGoogle = localStorage.getItem('aura_dummy_google_session')
      if (storedDummyGoogle) {
        dummyGoogleUser.value = JSON.parse(storedDummyGoogle)
      } else {
        const storedGuest = localStorage.getItem('aura_guest_session')
        if (storedGuest) {
          guestUser.value = JSON.parse(storedGuest)
        }
      }
    } catch (e) {
      console.warn('Error reading local session:', e)
    } finally {
      isAuthChecking.value = false
    }
  }

  watch(supabaseUser, async (newUser) => {
    if (isSupabaseConfigured.value && newUser && typeof window !== 'undefined') {
      const pendingMigration = localStorage.getItem('aura_pending_guest_migration')
      if (pendingMigration === 'true') {
        await migrateGuestDataToSupabase(newUser.id)
      }
    }
  })

  // Active current user
  const currentUser = computed<AuraUser | null>(() => {
    if (isSupabaseConfigured.value && supabaseUser.value) {
      const meta = supabaseUser.value.user_metadata || {}
      return {
        id: supabaseUser.value.id,
        displayName: meta.full_name || meta.name || supabaseUser.value.email?.split('@')[0] || 'Sahabat Ara',
        email: supabaseUser.value.email,
        isGuest: Boolean(supabaseUser.value.is_anonymous || meta.is_guest),
        avatarUrl: meta.avatar_url || meta.picture || undefined
      }
    }

    if (dummyGoogleUser.value) {
      return dummyGoogleUser.value
    }

    if (guestUser.value) {
      return guestUser.value
    }

    return null
  })

  const isAuthenticated = computed(() => currentUser.value !== null)
  const isGuest = computed(() => {
    if (isSupabaseConfigured.value && supabaseUser.value) {
      return Boolean(supabaseUser.value.is_anonymous || supabaseUser.value.user_metadata?.is_guest)
    }
    if (dummyGoogleUser.value) {
      return false
    }
    return currentUser.value?.isGuest ?? true
  })

  // 1. Google OAuth Sign-In (Real Supabase or Simulated Demo Google User)
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured.value) {
      // Simulate successful Google login in Dummy Mode
      const demoUser: AuraUser = {
        id: 'demo_google_user_001',
        displayName: 'Mahasiswa Demo (Google Dummy)',
        email: 'demo.ara@gmail.com',
        isGuest: false
      }
      dummyGoogleUser.value = demoUser
      guestUser.value = null
      if (typeof window !== 'undefined') {
        localStorage.setItem('aura_dummy_google_session', JSON.stringify(demoUser))
        localStorage.removeItem('aura_guest_session')
      }
      ensureSeedData()
      showToast('Berhasil masuk sebagai Mahasiswa Demo (Google Dummy)')
      return
    }

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Google Sign-In failed:', err.message || err)
      alert('Gagal menghubungkan ke Google: ' + (err.message || 'Cek konfigurasi Supabase Client ID/Secret'))
    }
  }

  // 2. Guest Mode (Anonymous Sign-In / LocalStorage fallback)
  const signInAsGuest = async () => {
    if (!isSupabaseConfigured.value) {
      createLocalGuest()
      return
    }

    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            is_guest: true,
            name: 'Tamu Anonim (Mode Lokal)'
          }
        }
      })

      if (!error && data?.user) {
        guestUser.value = {
          id: data.user.id,
          displayName: 'Tamu Anonim (Mode Lokal)',
          isGuest: true
        }
        return
      }

      createLocalGuest()
    } catch {
      createLocalGuest()
    }
  }

  const createLocalGuest = () => {
    const randomGuestId = 'guest_' + Math.random().toString(36).substring(2, 11)
    const newGuest: AuraUser = {
      id: randomGuestId,
      displayName: 'Tamu Anonim (Mode Lokal)',
      isGuest: true
    }
    guestUser.value = newGuest
    dummyGoogleUser.value = null
    if (typeof window !== 'undefined') {
      localStorage.setItem('aura_guest_session', JSON.stringify(newGuest))
      localStorage.removeItem('aura_dummy_google_session')
    }
    ensureSeedData()
  }

  // 3. Link Guest Session to Google (Real linkIdentity/migration or Instant UI Demo Conversion)
  const linkGuestToGoogle = async () => {
    if (!isSupabaseConfigured.value) {
      // Instant simulated conversion from Guest to Demo Google user while keeping all local data intact
      const demoUser: AuraUser = {
        id: 'demo_google_user_001',
        displayName: 'Mahasiswa Demo (Google Dummy)',
        email: 'demo.ara@gmail.com',
        isGuest: false
      }
      dummyGoogleUser.value = demoUser
      guestUser.value = null
      if (typeof window !== 'undefined') {
        localStorage.setItem('aura_dummy_google_session', JSON.stringify(demoUser))
        localStorage.removeItem('aura_guest_session')
      }
      showToast('Sesi Tamu berhasil ditautkan ke Mahasiswa Demo (Google Dummy)!')
      return
    }

    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined

    if (typeof window !== 'undefined') {
      localStorage.setItem('aura_pending_guest_migration', 'true')
    }

    if (supabaseUser.value?.is_anonymous) {
      try {
        const { data, error } = await (supabase.auth as any).linkIdentity({
          provider: 'google',
          options: {
            redirectTo: redirectUrl
          }
        })
        if (!error && data?.url) {
          window.location.href = data.url
          return
        }
      } catch (err) {
        console.warn('linkIdentity threw, falling back to OAuth migration flow:', err)
      }
    }

    await signInWithGoogle()
  }

  // 4. Sign Out
  const signOut = async () => {
    try {
      if (isSupabaseConfigured.value && supabaseUser.value) {
        await supabase.auth.signOut()
      }
    } catch (err) {
      console.warn('Sign out error:', err)
    } finally {
      guestUser.value = null
      dummyGoogleUser.value = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('aura_guest_session')
        localStorage.removeItem('aura_dummy_google_session')
      }
    }
  }

  return {
    currentUser,
    isAuthenticated,
    isGuest,
    isAuthChecking,
    isAuthModalOpen,
    isSupabaseConfigured,
    authToast,
    initAuth,
    signInWithGoogle,
    signInAsGuest,
    linkGuestToGoogle,
    signOut
  }
}
