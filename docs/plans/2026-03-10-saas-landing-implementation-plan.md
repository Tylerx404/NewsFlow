# NewsFlow Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current minimal home page with a full SaaS landing page optimized for sign-ups (Editorial Calm + Friendly).

**Architecture:** Update `apps/web/app/pages/index.vue` to render a structured landing page with sections, backed by i18n keys. Add minimal landing-specific typography utilities in global CSS if needed. Keep logged-in redirect behavior intact.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind CSS v4, shadcn-nuxt components, @nuxtjs/i18n.

---

### Task 1: Add English landing copy (i18n keys)

**Files:**
- Modify: `apps/web/i18n/locales/en.json`

**Step 1: Write the failing test**
Because there is no automated test harness, create a manual QA checklist entry in the PR description (not a file) for i18n coverage. This is the “test” for this task.

**Step 2: Run test to verify it fails**
Run: `rg -n "public.home.hero" apps/web/i18n/locales/en.json`
Expected: no matches (keys not present).

**Step 3: Write minimal implementation**
Add the following under `public.home` in `apps/web/i18n/locales/en.json`:

```json
"hero": {
  "title": "Read the right news in minutes",
  "subtitle": "NewsFlow personalizes your RSS and summarizes what matters, so you can stay informed without the noise.",
  "ctaPrimary": "Sign up now",
  "ctaSecondary": "View demo"
},
"trust": {
  "privacy": "Privacy-first",
  "noSpam": "No spam",
  "rssOpen": "Open RSS"
},
"benefits": {
  "title": "Why readers choose NewsFlow",
  "items": {
    "personalized": {
      "title": "Personalized by your interests",
      "description": "Follow topics you care about and let the rest fade away."
    },
    "clear": {
      "title": "Clear, compact summaries",
      "description": "Get the key points fast with consistent, readable highlights."
    },
    "focus": {
      "title": "Less noise, more signal",
      "description": "Cut through headlines and focus on what actually matters."
    }
  }
},
"howItWorks": {
  "title": "How it works",
  "steps": {
    "add": {
      "title": "Add your sources",
      "description": "Connect RSS feeds you already trust."
    },
    "summarize": {
      "title": "AI summarizes",
      "description": "We extract the main points with consistent structure."
    },
    "read": {
      "title": "Read by priority",
      "description": "Skim by topic, urgency, and interest."
    }
  }
},
"demo": {
  "title": "A quick look",
  "subtitle": "See what a clean summary feels like.",
  "cardTitle": "Daily Brief: AI & Tech",
  "cardSource": "From 8 sources",
  "bullets": {
    "one": "Major funding rounds slowed slightly this week.",
    "two": "Two new open-source models reached top benchmarks.",
    "three": "Regulators signaled tighter disclosure requirements."
  }
},
"useCases": {
  "title": "Fits your routine",
  "items": {
    "morning": "Morning briefing in 5 minutes",
    "industry": "Track your industry without overload",
    "evening": "Catch up at the end of the day"
  }
},
"faq": {
  "title": "FAQ",
  "items": {
    "rss": {
      "q": "Do I need RSS to use NewsFlow?",
      "a": "RSS works best, but you can start with suggested sources."
    },
    "accuracy": {
      "q": "How accurate are the summaries?",
      "a": "We focus on key points and let you open the original anytime."
    },
    "privacy": {
      "q": "Is my data private?",
      "a": "We do not sell your data and avoid tracking beyond essentials."
    }
  }
},
"finalCta": {
  "title": "Start reading smarter today",
  "subtitle": "Build your feed, save time, and stay focused.",
  "cta": "Sign up now"
}
```

**Step 4: Run test to verify it passes**
Run: `rg -n "public.home.hero" apps/web/i18n/locales/en.json`
Expected: matches found.

**Step 5: Commit**
```bash
git add apps/web/i18n/locales/en.json
git commit -m "docs(i18n): add landing copy in en"
```

### Task 2: Add Vietnamese landing copy (i18n keys)

**Files:**
- Modify: `apps/web/i18n/locales/vi.json`

**Step 1: Write the failing test**
Run: `rg -n "public.home.hero" apps/web/i18n/locales/vi.json`
Expected: no matches.

**Step 2: Run test to verify it fails**
Same as Step 1 (no matches).

**Step 3: Write minimal implementation**
Add the following under `public.home` in `apps/web/i18n/locales/vi.json`:

```json
"hero": {
  "title": "Đọc đúng tin bạn cần trong vài phút",
  "subtitle": "NewsFlow cá nhân hóa RSS và tóm tắt phần quan trọng để bạn nắm ý nhanh, không bị nhiễu.",
  "ctaPrimary": "Đăng ký ngay",
  "ctaSecondary": "Xem bản demo"
},
"trust": {
  "privacy": "Tôn trọng quyền riêng tư",
  "noSpam": "Không spam",
  "rssOpen": "RSS mở"
},
"benefits": {
  "title": "Vì sao người đọc chọn NewsFlow",
  "items": {
    "personalized": {
      "title": "Cá nhân hóa theo sở thích",
      "description": "Theo dõi đúng chủ đề bạn quan tâm và bỏ qua phần còn lại."
    },
    "clear": {
      "title": "Tóm tắt rõ, gọn",
      "description": "Nắm ý chính nhanh với điểm nhấn dễ đọc."
    },
    "focus": {
      "title": "Giảm nhiễu, tăng tín hiệu",
      "description": "Cắt bớt tiêu đề gây xao nhãng, tập trung vào điều quan trọng."
    }
  }
},
"howItWorks": {
  "title": "Hoạt động như thế nào",
  "steps": {
    "add": {
      "title": "Thêm nguồn của bạn",
      "description": "Kết nối RSS từ các nguồn bạn tin tưởng."
    },
    "summarize": {
      "title": "AI tóm tắt",
      "description": "Chúng tôi rút ra ý chính theo cấu trúc nhất quán."
    },
    "read": {
      "title": "Đọc theo ưu tiên",
      "description": "Lướt theo chủ đề, mức độ quan tâm và độ khẩn."
    }
  }
},
"demo": {
  "title": "Xem nhanh bản tóm tắt",
  "subtitle": "Cảm nhận cách đọc gọn gàng, rõ ràng.",
  "cardTitle": "Bản tin ngày: AI & Công nghệ",
  "cardSource": "Từ 8 nguồn",
  "bullets": {
    "one": "Dòng vốn đầu tư tuần này chậm lại nhẹ.",
    "two": "Hai mô hình mã nguồn mở đạt top benchmark mới.",
    "three": "Cơ quan quản lý siết yêu cầu minh bạch."
  }
},
"useCases": {
  "title": "Hợp với nhịp sống của bạn",
  "items": {
    "morning": "Bản tin sáng trong 5 phút",
    "industry": "Theo dõi ngành mà không bị quá tải",
    "evening": "Tổng hợp cuối ngày nhanh gọn"
  }
},
"faq": {
  "title": "Câu hỏi thường gặp",
  "items": {
    "rss": {
      "q": "Cần RSS mới dùng được NewsFlow?",
      "a": "RSS là tối ưu nhất, nhưng bạn có thể bắt đầu từ nguồn gợi ý."
    },
    "accuracy": {
      "q": "Tóm tắt có chính xác không?",
      "a": "Chúng tôi tập trung ý chính và luôn cho bạn mở bài gốc."
    },
    "privacy": {
      "q": "Dữ liệu của tôi có an toàn?",
      "a": "Chúng tôi không bán dữ liệu và hạn chế tracking tối đa."
    }
  }
},
"finalCta": {
  "title": "Bắt đầu đọc thông minh hơn hôm nay",
  "subtitle": "Xây feed của bạn, tiết kiệm thời gian, giữ tập trung.",
  "cta": "Đăng ký ngay"
}
```

**Step 4: Run test to verify it passes**
Run: `rg -n "public.home.hero" apps/web/i18n/locales/vi.json`
Expected: matches found.

**Step 5: Commit**
```bash
git add apps/web/i18n/locales/vi.json
git commit -m "docs(i18n): add landing copy in vi"
```

### Task 3: Add remaining locale copy (zh/ja/kr)

**Files:**
- Modify: `apps/web/i18n/locales/zh.json`
- Modify: `apps/web/i18n/locales/jp.json`
- Modify: `apps/web/i18n/locales/kr.json`

**Step 1: Write the failing test**
Run:
```bash
rg -n "public.home.hero" apps/web/i18n/locales/zh.json
rg -n "public.home.hero" apps/web/i18n/locales/jp.json
rg -n "public.home.hero" apps/web/i18n/locales/kr.json
```
Expected: no matches.

**Step 2: Run test to verify it fails**
Same as Step 1 (no matches).

**Step 3: Write minimal implementation**
Add translations using the same key structure as in EN/VI. (Use concise, friendly tone; avoid AI hype.)

**Step 4: Run test to verify it passes**
Repeat Step 1 and ensure matches exist.

**Step 5: Commit**
```bash
git add apps/web/i18n/locales/zh.json apps/web/i18n/locales/jp.json apps/web/i18n/locales/kr.json
git commit -m "docs(i18n): add landing copy in zh/jp/kr"
```

### Task 4: Add landing typography utility

**Files:**
- Modify: `apps/web/app/assets/css/main.css`

**Step 1: Write the failing test**
Run: `rg -n "landing-title" apps/web/app/assets/css/main.css`
Expected: no matches.

**Step 2: Run test to verify it fails**
Same as Step 1 (no matches).

**Step 3: Write minimal implementation**
Add this under `@layer components`:

```css
.landing-title {
  font-family: var(--reader-font-family);
}
```

**Step 4: Run test to verify it passes**
Run: `rg -n "landing-title" apps/web/app/assets/css/main.css`
Expected: match found.

**Step 5: Commit**
```bash
git add apps/web/app/assets/css/main.css
git commit -m "style: add landing title typography"
```

### Task 5: Build the new landing page layout

**Files:**
- Modify: `apps/web/app/pages/index.vue`

**Step 1: Write the failing test**
Manual check: existing page is a single card layout, not the landing layout.

**Step 2: Run test to verify it fails**
Open `/` in dev server (later) and confirm it does not match the planned layout.

**Step 3: Write minimal implementation**
Replace the template with the new structured sections and use i18n keys. Keep the logged-in redirect.

```vue
<script setup lang="ts">
const { $authClient } = useNuxtApp();
const { t } = useI18n();

const benefitItems = [
  {
    titleKey: "public.home.benefits.items.personalized.title",
    descriptionKey: "public.home.benefits.items.personalized.description"
  },
  {
    titleKey: "public.home.benefits.items.clear.title",
    descriptionKey: "public.home.benefits.items.clear.description"
  },
  {
    titleKey: "public.home.benefits.items.focus.title",
    descriptionKey: "public.home.benefits.items.focus.description"
  }
];

const howSteps = [
  {
    titleKey: "public.home.howItWorks.steps.add.title",
    descriptionKey: "public.home.howItWorks.steps.add.description"
  },
  {
    titleKey: "public.home.howItWorks.steps.summarize.title",
    descriptionKey: "public.home.howItWorks.steps.summarize.description"
  },
  {
    titleKey: "public.home.howItWorks.steps.read.title",
    descriptionKey: "public.home.howItWorks.steps.read.description"
  }
];

const useCases = [
  "public.home.useCases.items.morning",
  "public.home.useCases.items.industry",
  "public.home.useCases.items.evening"
];

const faqItems = [
  {
    questionKey: "public.home.faq.items.rss.q",
    answerKey: "public.home.faq.items.rss.a"
  },
  {
    questionKey: "public.home.faq.items.accuracy.q",
    answerKey: "public.home.faq.items.accuracy.a"
  },
  {
    questionKey: "public.home.faq.items.privacy.q",
    answerKey: "public.home.faq.items.privacy.a"
  }
];

onMounted(async () => {
  const { data } = await $authClient.getSession();
  if (data?.session) {
    await navigateTo("/dashboard");
  }
});
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <section class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-12 pt-16">
      <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div class="space-y-6">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{{ t("app.name") }}</p>
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
            <a
              href="#demo"
              class="inline-flex h-11 items-center rounded-md border px-6 text-sm font-semibold"
            >
              {{ t("public.home.hero.ctaSecondary") }}
            </a>
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
              <p class="text-xs uppercase tracking-widest text-muted-foreground">Summary</p>
              <ul class="space-y-2 text-sm">
                <li>• {{ t("public.home.demo.bullets.one") }}</li>
                <li>• {{ t("public.home.demo.bullets.two") }}</li>
                <li>• {{ t("public.home.demo.bullets.three") }}</li>
              </ul>
            </div>
            <div class="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div class="rounded-lg border bg-background px-3 py-2">Top reads</div>
              <div class="rounded-lg border bg-background px-3 py-2">AI highlights</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-6 pb-12">
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="item in benefitItems" :key="item.titleKey" class="rounded-2xl border bg-card p-6">
          <h3 class="text-lg font-semibold">{{ t(item.titleKey) }}</h3>
          <p class="mt-2 text-sm text-muted-foreground">{{ t(item.descriptionKey) }}</p>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-6 pb-12">
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">{{ t("public.home.howItWorks.title") }}</h2>
        <div class="mt-6 grid gap-6 md:grid-cols-3">
          <div v-for="step in howSteps" :key="step.titleKey" class="space-y-2">
            <div class="text-sm font-semibold">{{ t(step.titleKey) }}</div>
            <p class="text-sm text-muted-foreground">{{ t(step.descriptionKey) }}</p>
          </div>
        </div>
      </div>
    </section>

    <section id="demo" class="mx-auto w-full max-w-6xl px-6 pb-12">
      <div class="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div class="space-y-3">
          <h2 class="landing-title text-2xl font-semibold">{{ t("public.home.demo.title") }}</h2>
          <p class="text-sm text-muted-foreground">{{ t("public.home.demo.subtitle") }}</p>
        </div>
        <div class="rounded-2xl border bg-card p-6">
          <div class="space-y-3">
            <p class="text-xs uppercase tracking-widest text-muted-foreground">Highlights</p>
            <ul class="space-y-2 text-sm">
              <li>• {{ t("public.home.demo.bullets.one") }}</li>
              <li>• {{ t("public.home.demo.bullets.two") }}</li>
              <li>• {{ t("public.home.demo.bullets.three") }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-6 pb-12">
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">{{ t("public.home.useCases.title") }}</h2>
        <ul class="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <li v-for="item in useCases" :key="item" class="rounded-xl border bg-background px-4 py-3">
            {{ t(item) }}
          </li>
        </ul>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-6 pb-12">
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">{{ t("public.home.faq.title") }}</h2>
        <div class="mt-4 space-y-4">
          <div v-for="item in faqItems" :key="item.questionKey" class="rounded-xl border bg-background p-4">
            <p class="text-sm font-semibold">{{ t(item.questionKey) }}</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ t(item.answerKey) }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-6 pb-16">
      <div class="rounded-2xl border bg-card p-8 text-center">
        <h2 class="landing-title text-2xl font-semibold">{{ t("public.home.finalCta.title") }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">{{ t("public.home.finalCta.subtitle") }}</p>
        <NuxtLink
          to="/signup"
          class="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {{ t("public.home.finalCta.cta") }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
```

**Step 4: Run test to verify it passes**
Run: `bun run dev:web` and open `/`.
Expected:
- Hero + demo mockup visible.
- Sections render without overflow on mobile.
- CTA buttons visible.

**Step 5: Commit**
```bash
git add apps/web/app/pages/index.vue
git commit -m "feat(web): build landing page layout"
```

### Task 6: Manual QA + type check

**Files:**
- None

**Step 1: Write the failing test**
Use a checklist and verify at least one item fails before fixes:
- All new text is translated across locales.
- Hero CTA links to `/signup`.
- Demo anchor scrolls.
- Layout does not overflow on mobile.

**Step 2: Run test to verify it fails**
Run: `bun run check-types` (expected: PASS). Then manually inspect the page; note any failures.

**Step 3: Write minimal implementation**
Fix any issues found during manual QA.

**Step 4: Run test to verify it passes**
Re-check the page on mobile and desktop breakpoints.

**Step 5: Commit**
```bash
git add apps/web/app/pages/index.vue apps/web/i18n/locales/*.json apps/web/app/assets/css/main.css
git commit -m "chore(web): polish landing page QA fixes"
```
