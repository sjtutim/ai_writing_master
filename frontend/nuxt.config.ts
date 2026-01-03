export default defineNuxtConfig({
  devtools: { enabled: false },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '',
    },
  },

  app: {
    head: {
      title: '写作高手 - RAG写作系统',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '本地化RAG智能写作系统' },
      ],
    },
  },

  devServer: {
    port: 3007,
  },

  compatibilityDate: '2024-01-01',

  routeRules: {
    '/api/**': {
      proxy: 'http://localhost:3001/api/**',
    },
  },
})
