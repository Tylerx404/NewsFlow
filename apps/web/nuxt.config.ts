import "@NewsFlow/env/web";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  modules: ["shadcn-nuxt"],
  css: ["~/assets/css/main.css"],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
  shadcn: {
    prefix: '',
    componentDir: "./app/components/ui",
  },
  devServer: {
    port: 3001,
  },
  runtimeConfig: {
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL,
    },
  },
});
