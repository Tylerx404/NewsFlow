# Home Hero Focus Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Focus the public home page on a single Hero section and update PublicHeader language/theme controls.

**Architecture:** Update `apps/web/app/pages/index.vue` to keep only the Hero block. Refresh i18n strings for hero/demo copy across all locales. Extend `PublicHeader` to show compact language codes with icon and a theme mode selector that uses existing reader-preferences state.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, shadcn-nuxt UI, vue-i18n, lucide-vue-next.

---

### Task 1: Update home Hero copy in i18n locales

**Files:**
- Modify: `apps/web/i18n/locales/en.json`
- Modify: `apps/web/i18n/locales/vi.json`
- Modify: `apps/web/i18n/locales/zh.json`
- Modify: `apps/web/i18n/locales/jp.json`
- Modify: `apps/web/i18n/locales/kr.json`

**Step 1: Update English copy**

```json
"hero": {
  "title": "AI summaries for RSS, personalized for you",
  "subtitle": "NewsFlow filters by your interests and condenses the key points so you stay informed without the noise.",
  "ctaPrimary": "Start free",
  "ctaSecondary": "View demo"
},
"demo": {
  "cardTitle": "Today's Brief: AI & Tech",
  "cardSource": "From 8 sources",
  "summaryLabel": "Summary",
  "bullets": {
    "one": "Open-source models gained new traction this week.",
    "two": "Regulators pushed for clearer AI disclosure rules.",
    "three": "Energy-efficient chips are becoming the default."
  },
  "chips": {
    "topReads": "Top reads",
    "aiHighlights": "AI highlights"
  }
}
```

**Step 2: Update Vietnamese copy**

```json
"hero": {
  "title": "Tóm tắt AI cho RSS, cá nhân hoá theo bạn",
  "subtitle": "NewsFlow lọc tin theo sở thích và rút gọn điểm chính, giúp bạn nắm nhanh mà không nhiễu.",
  "ctaPrimary": "Bắt đầu miễn phí",
  "ctaSecondary": "Xem demo"
},
"demo": {
  "cardTitle": "Bản tin hôm nay: AI & Tech",
  "cardSource": "Từ 8 nguồn",
  "summaryLabel": "Tóm tắt",
  "bullets": {
    "one": "Mô hình mã nguồn mở tăng tốc trong tuần qua.",
    "two": "Quy định mới yêu cầu minh bạch AI rõ ràng hơn.",
    "three": "Chip tiết kiệm năng lượng đang thành xu hướng."
  },
  "chips": {
    "topReads": "Đọc nhiều",
    "aiHighlights": "Điểm nhấn AI"
  }
}
```

**Step 3: Update Chinese copy**

```json
"hero": {
  "title": "AI 摘要 RSS，按你的兴趣个性化",
  "subtitle": "NewsFlow 根据兴趣筛选内容并浓缩要点，让你快速了解又不被噪音干扰。",
  "ctaPrimary": "免费开始",
  "ctaSecondary": "查看演示"
},
"demo": {
  "cardTitle": "今日简报：AI 与科技",
  "cardSource": "来自 8 个来源",
  "summaryLabel": "摘要",
  "bullets": {
    "one": "开源模型本周热度持续上升。",
    "two": "监管机构推动更清晰的 AI 披露规则。",
    "three": "低功耗芯片正在成为默认选择。"
  },
  "chips": {
    "topReads": "热门阅读",
    "aiHighlights": "AI 要点"
  }
}
```

**Step 4: Update Japanese copy**

```json
"hero": {
  "title": "RSSをAIで要約、あなたに最適化",
  "subtitle": "NewsFlowは関心に合わせて記事を絞り、要点を短くまとめてノイズなく把握できます。",
  "ctaPrimary": "無料で始める",
  "ctaSecondary": "デモを見る"
},
"demo": {
  "cardTitle": "今日のブリーフ：AI & Tech",
  "cardSource": "8ソースから",
  "summaryLabel": "要約",
  "bullets": {
    "one": "オープンソースモデルの勢いが強まっています。",
    "two": "AIの開示ルールがより明確化へ。",
    "three": "省電力チップが標準になりつつあります。"
  },
  "chips": {
    "topReads": "注目記事",
    "aiHighlights": "AIハイライト"
  }
}
```

**Step 5: Update Korean copy**

```json
"hero": {
  "title": "RSS를 AI로 요약, 나에게 맞게",
  "subtitle": "NewsFlow가 관심사에 맞춰 필터링하고 핵심만 요약해 노이즈 없이 빠르게 파악할 수 있습니다.",
  "ctaPrimary": "무료로 시작",
  "ctaSecondary": "데모 보기"
},
"demo": {
  "cardTitle": "오늘의 브리프: AI & Tech",
  "cardSource": "8개 출처",
  "summaryLabel": "요약",
  "bullets": {
    "one": "오픈소스 모델에 대한 관심이 다시 높아졌습니다.",
    "two": "AI 공개 규정이 더 명확해지고 있습니다.",
    "three": "저전력 칩이 기본 선택이 되고 있습니다."
  },
  "chips": {
    "topReads": "인기 읽을거리",
    "aiHighlights": "AI 하이라이트"
  }
}
```

**Step 6: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('apps/web/i18n/locales/en.json','utf8'))"`
Expected: no output / exit code 0

**Step 7: Commit**

```bash
git add apps/web/i18n/locales/en.json apps/web/i18n/locales/vi.json apps/web/i18n/locales/zh.json apps/web/i18n/locales/jp.json apps/web/i18n/locales/kr.json
git commit -m "chore(i18n): refresh home hero copy"
```

---

### Task 2: Simplify Home page to Hero-only

**Files:**
- Modify: `apps/web/app/pages/index.vue`

**Step 1: Remove unused section data in `<script setup>`**

```ts
// Keep only i18n and redirect logic
const { $authClient } = useNuxtApp();
const { t } = useI18n();

definePageMeta({ layout: "public" });

onMounted(async () => {
  const { data } = await $authClient.getSession();
  if (data?.session) {
    await navigateTo("/dashboard");
  }
});
```

**Step 2: Update template to only include Hero block**

```vue
<section class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-12 pt-16">
  <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
    <div class="space-y-6">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {{ t("app.name") }}
      </p>
      <h1 class="landing-title text-4xl font-semibold leading-tight sm:text-5xl">
        {{ t("public.home.hero.title") }}
      </h1>
      <p class="text-lg text-muted-foreground">
        {{ t("public.home.hero.subtitle") }}
      </p>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/signup"
          class="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {{ t("public.home.hero.ctaPrimary") }}
        </NuxtLink>
      </div>
      <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span class="rounded-full border px-3 py-1">{{ t("public.home.trust.privacy") }}</span>
        <span class="rounded-full border px-3 py-1">{{ t("public.home.trust.noSpam") }}</span>
        <span class="rounded-full border px-3 py-1">{{ t("public.home.trust.rssOpen") }}</span>
      </div>
    </div>
    <div class="rounded-2xl border bg-card p-6 shadow-sm">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">{{ t("public.home.demo.cardTitle") }}</div>
          <div class="text-xs text-muted-foreground">{{ t("public.home.demo.cardSource") }}</div>
        </div>
        <div class="space-y-3 rounded-xl border bg-background p-4">
          <p class="text-xs uppercase tracking-widest text-muted-foreground">
            {{ t("public.home.demo.summaryLabel") }}
          </p>
          <ul class="space-y-2 text-sm">
            <li>• {{ t("public.home.demo.bullets.one") }}</li>
            <li>• {{ t("public.home.demo.bullets.two") }}</li>
            <li>• {{ t("public.home.demo.bullets.three") }}</li>
          </ul>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div class="rounded-lg border bg-background px-3 py-2">
            {{ t("public.home.demo.chips.topReads") }}
          </div>
          <div class="rounded-lg border bg-background px-3 py-2">
            {{ t("public.home.demo.chips.aiHighlights") }}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

**Step 3: Commit**

```bash
git add apps/web/app/pages/index.vue
git commit -m "feat(web): focus home on hero"
```

---

### Task 3: Update PublicHeader language + theme controls

**Files:**
- Modify: `apps/web/app/components/PublicHeader.vue`

**Step 1: Add imports and state**

```ts
import { Languages, MonitorCog, Moon, Sun, Menu } from "lucide-vue-next";
import { computed, ref } from "vue";

import { useReadingPreferences } from "@/composables/use-reading-preferences";
import { getThemeModeOptions, isThemeMode } from "@/lib/reader-preferences";
```

**Step 2: Add language code mapping + computed labels**

```ts
type AppLocale = "en" | "vi" | "zh" | "jp" | "kr";

const languageCodes: Record<AppLocale, string> = {
  en: "US",
  vi: "VN",
  zh: "CN",
  jp: "JP",
  kr: "KR",
};

const languageOptions = computed(() =>
  locales.value.map((item) => {
    const code = typeof item === "string" ? item : item.code;
    if (!isAppLocale(code)) {
      return { code, label: t("locale.label"), short: "--" };
    }
    return { code, label: t(`locale.options.${code}`), short: languageCodes[code] };
  })
);

const currentLanguageShort = computed(() => {
  if (!isAppLocale(locale.value)) return "--";
  return languageCodes[locale.value];
});
```

**Step 3: Add theme mode controls**

```ts
const readingPreferences = useReadingPreferences();
const localizedThemeModeOptions = computed(() => getThemeModeOptions(t));

const currentThemeModeLabel = computed(
  () =>
    localizedThemeModeOptions.value.find(
      (item) => item.value === readingPreferences.value.themeMode
    )?.label ?? t("settings.appearance.page.fields.themeMode")
);

const handleThemeModeChange = (value: unknown) => {
  if (typeof value !== "string") return;
  if (!isThemeMode(value)) return;
  readingPreferences.value.themeMode = value;
};
```

**Step 4: Update template (desktop buttons)**

```vue
<DropdownMenu>
  <DropdownMenuTrigger as-child>
    <Button variant="outline" size="sm" class="hidden items-center gap-2 md:inline-flex">
      <Languages class="size-4" />
      <span class="text-xs font-semibold tracking-wide">{{ currentLanguageShort }}</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="min-w-44 rounded-xl">
    <DropdownMenuRadioGroup :model-value="locale" @update:model-value="handleLanguageChange">
      <DropdownMenuRadioItem
        v-for="option in languageOptions"
        :key="option.code"
        :value="option.code"
      >
        <span class="inline-flex w-8 text-xs font-semibold">{{ option.short }}</span>
        {{ option.label }}
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>

<DropdownMenu>
  <DropdownMenuTrigger as-child>
    <Button variant="outline" size="sm" class="hidden items-center gap-2 md:inline-flex">
      <MonitorCog v-if="readingPreferences.themeMode === 'system'" class="size-4" />
      <Sun v-else-if="readingPreferences.themeMode === 'light'" class="size-4" />
      <Moon v-else class="size-4" />
      <span class="text-xs font-semibold">{{ currentThemeModeLabel }}</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="min-w-48 rounded-xl">
    <DropdownMenuRadioGroup
      :model-value="readingPreferences.themeMode"
      @update:model-value="handleThemeModeChange"
    >
      <DropdownMenuRadioItem
        v-for="modeOption in localizedThemeModeOptions"
        :key="modeOption.value"
        :value="modeOption.value"
      >
        <MonitorCog v-if="modeOption.value === 'system'" />
        <Sun v-else-if="modeOption.value === 'light'" />
        <Moon v-else />
        {{ modeOption.label }}
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

**Step 5: Update template (mobile sheet)**

```vue
<DropdownMenu>
  <DropdownMenuTrigger as-child>
    <Button variant="outline" size="sm" class="justify-start gap-2">
      <Languages class="size-4" />
      <span class="text-xs font-semibold tracking-wide">{{ currentLanguageShort }}</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start" class="min-w-44 rounded-xl">
    <DropdownMenuRadioGroup :model-value="locale" @update:model-value="handleLanguageChange">
      <DropdownMenuRadioItem
        v-for="option in languageOptions"
        :key="option.code"
        :value="option.code"
      >
        <span class="inline-flex w-8 text-xs font-semibold">{{ option.short }}</span>
        {{ option.label }}
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>

<DropdownMenu>
  <DropdownMenuTrigger as-child>
    <Button variant="outline" size="sm" class="justify-start gap-2">
      <MonitorCog v-if="readingPreferences.themeMode === 'system'" class="size-4" />
      <Sun v-else-if="readingPreferences.themeMode === 'light'" class="size-4" />
      <Moon v-else class="size-4" />
      <span class="text-xs font-semibold">{{ currentThemeModeLabel }}</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start" class="min-w-48 rounded-xl">
    <DropdownMenuRadioGroup
      :model-value="readingPreferences.themeMode"
      @update:model-value="handleThemeModeChange"
    >
      <DropdownMenuRadioItem
        v-for="modeOption in localizedThemeModeOptions"
        :key="modeOption.value"
        :value="modeOption.value"
      >
        <MonitorCog v-if="modeOption.value === 'system'" />
        <Sun v-else-if="modeOption.value === 'light'" />
        <Moon v-else />
        {{ modeOption.label }}
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

**Step 6: Commit**

```bash
git add apps/web/app/components/PublicHeader.vue
git commit -m "feat(web): add language codes and theme switcher to public header"
```

---

### Task 4: Verify behavior & type safety

**Files:**
- None (validation only)

**Step 1: Run type check**

Run: `bun run check-types`
Expected: Exit code 0

**Step 2: Manual smoke check**
- Open home page: only Hero appears.
- Language dropdown shows `US/VN/CN/JP/KR` and switches locale.
- Theme dropdown updates light/dark/system modes and persists on reload.

**Step 3: Commit (if any minor fixes)**

```bash
git add apps/web/app/pages/index.vue apps/web/app/components/PublicHeader.vue apps/web/i18n/locales/*.json
git commit -m "fix(web): polish hero and header controls"
```
