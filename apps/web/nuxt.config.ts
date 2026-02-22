import "@NewsFlow/env/web";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  modules: ["shadcn-nuxt", '@nuxtjs/tailwindcss'],
  css: ["~/assets/css/main.css"],
  shadcn: {
    prefix: '',
    componentDir: "./app/components/ui",
  },
  alias: {
    "@": "./app",
    "@/components": "./app/components",
    "@/lib": "./app/lib",
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
