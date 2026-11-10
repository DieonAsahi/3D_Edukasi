/**
 * Safe Mock Wrapper for Supabase composables when @nuxtjs/supabase module
 * is disabled in Dummy/Local Mode (no real credentials in .env).
 */

export const useSupabaseUser = () => {
  return useState<any>('aura_mock_supabase_user', () => null)
}

export const useSupabaseClient = () => {
  const createQueryBuilder = () => {
    const builder: any = {
      select: () => builder,
      insert: async () => ({ data: null, error: null }),
      update: () => builder,
      delete: () => builder,
      eq: () => Promise.resolve({ data: null, error: null }),
      order: () => Promise.resolve({ data: [], error: null }),
      then: (resolve: any) => resolve({ data: [], error: null })
    }
    return builder
  }

  return {
    auth: {
      signInWithOAuth: async () => ({ data: { provider: 'google', url: null }, error: null }),
      signInAnonymously: async () => ({ data: { user: null, session: null }, error: new Error('Mock mode active') }),
      linkIdentity: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null })
    },
    from: (_table: string) => createQueryBuilder()
  }
}

