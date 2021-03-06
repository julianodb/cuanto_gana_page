export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'cuanto_gana_page',
    htmlAttrs: {
      lang: 'es'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
      { name: 'format-detection', content: 'telephone=no' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    '@nuxt/http',
    'nuxt-buefy'
  ],

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
  },
  server: {
    port: 3001
  },
  generate: {
    cache: {
      ignore: [
        'content_src'
      ]
    }
  },
  render: {
    // Setting up cache for 'static' directory - an hour in milliseconds
    // https://web.dev/uses-long-cache-ttl
    static: {
      maxAge: 60 * 60,
    },
  },
}
