// https://nuxt.com/docs/api/configuration/nuxt-config
const hasRealSupabase = Boolean(
  process.env.SUPABASE_URL &&
  !process.env.SUPABASE_URL.includes('placeholder-project') &&
  !process.env.SUPABASE_URL.includes('your-project') &&
  process.env.SUPABASE_KEY &&
  !process.env.SUPABASE_KEY.includes('placeholder') &&
  !process.env.SUPABASE_KEY.includes('your-')
)

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  modules: [
    '@nuxtjs/tailwindcss',
    // Load @nuxtjs/supabase ONLY when genuine Supabase credentials are provided
    ...(hasRealSupabase ? ['@nuxtjs/supabase'] : []),
    '@tresjs/nuxt'
  ],
  experimental: {
    appManifest: false,
  },
  ...(hasRealSupabase
    ? {
        supabase: {
          url: process.env.SUPABASE_URL,
          key: process.env.SUPABASE_KEY,
          redirect: false,
        }
      }
    : {}),
  hooks: {
    'imports:extend'(imports) {
      // Remove mock composables when real @nuxtjs/supabase module is active to prevent duplicate warnings
      if (hasRealSupabase) {
        for (let i = imports.length - 1; i >= 0; i--) {
          if (imports[i].from?.includes('useSupabaseMock')) {
            imports.splice(i, 1)
          }
        }
      }
    }
  },
  tres: {
    glsl: true,
  },
  nitro: {
    externals: {
      inline: ['unhead', '@unhead/vue']
    }
  },
  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    public: {
      supabaseUrl: hasRealSupabase ? process.env.SUPABASE_URL : '',
      supabaseKey: hasRealSupabase ? process.env.SUPABASE_KEY : '',
      isDummyMode: !hasRealSupabase
    }
  },
  app: {
    head: {
      title: 'Ara - 3D Virtual CBT Companion & Productivity Coach',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Pendamping psikologis berbasis AI dengan prinsip CBT ringan dan manajemen produktivitas untuk SDG 3' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700&display=swap' }
      ]
    }
  }
})
