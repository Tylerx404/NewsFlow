import "@NewsFlow/env/web";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  modules: ["shadcn-nuxt", "@nuxtjs/i18n"],
  css: ["~/assets/css/main.css"],
  postcss: {
    plugins: {
      "@tailwindcss/postcss": {},
    },
  },
  shadcn: {
    prefix: "",
    componentDir: "./app/components/ui",
  },
  i18n: {
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL,
    strategy: "no_prefix",
    defaultLocale: "en",
    lazy: true,
    langDir: "locales",
    locales: [
      { code: "en", name: "English", language: "en-US", file: "en.json" },
      { code: "vi", name: "Tiếng Việt", language: "vi-VN", file: "vi.json" },
      { code: "zh", name: "中文", language: "zh-CN", file: "zh.json" },
      { code: "kr", name: "한국어", language: "ko-KR", file: "kr.json" },
      { code: "jp", name: "日本語", language: "ja-JP", file: "jp.json" },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "newsflow_locale",
      redirectOn: "root",
      fallbackLocale: "en",
    },
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
