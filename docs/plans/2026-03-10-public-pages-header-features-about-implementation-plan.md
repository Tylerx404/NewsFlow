# Public Pages + Island Header Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a shared island header and new public Features/About pages with full i18n coverage.

**Architecture:** Introduce a `public` layout that renders a reusable `PublicHeader` component and wraps `/`, `/features`, `/about`, `/pricing`. Add new pages with sectioned content and map UI copy through i18n keys.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind CSS v4, shadcn-nuxt components, @nuxtjs/i18n.

---

### Task 1: Add public nav i18n keys (all locales)

**Files:**
- Modify: `apps/web/i18n/locales/en.json`
- Modify: `apps/web/i18n/locales/vi.json`
- Modify: `apps/web/i18n/locales/zh.json`
- Modify: `apps/web/i18n/locales/jp.json`
- Modify: `apps/web/i18n/locales/kr.json`

**Step 1: Write the failing test**
Run:
```bash
rg -n "\"nav\"\s*:\s*\{[^}]*\"home\"" -U apps/web/i18n/locales/en.json
```
Expected: no matches.

**Step 2: Run test to verify it fails**
Same as Step 1 (no matches).

**Step 3: Write minimal implementation**
Add under `public` in each locale file.

`apps/web/i18n/locales/en.json`:
```json
"nav": {
  "home": "Home",
  "features": "Features",
  "pricing": "Pricing",
  "about": "About",
  "cta": "Start free"
}
```

`apps/web/i18n/locales/vi.json`:
```json
"nav": {
  "home": "Trang chủ",
  "features": "Tính năng",
  "pricing": "Bảng giá",
  "about": "Giới thiệu",
  "cta": "Bắt đầu miễn phí"
}
```

`apps/web/i18n/locales/zh.json`:
```json
"nav": {
  "home": "主页",
  "features": "功能",
  "pricing": "定价",
  "about": "关于",
  "cta": "免费开始"
}
```

`apps/web/i18n/locales/jp.json`:
```json
"nav": {
  "home": "ホーム",
  "features": "機能",
  "pricing": "料金",
  "about": "About",
  "cta": "無料で始める"
}
```

`apps/web/i18n/locales/kr.json`:
```json
"nav": {
  "home": "홈",
  "features": "기능",
  "pricing": "요금제",
  "about": "소개",
  "cta": "무료로 시작"
}
```

**Step 4: Run test to verify it passes**
Run:
```bash
rg -n "\"nav\"\s*:\s*\{[^}]*\"home\"" -U apps/web/i18n/locales/en.json
```
Expected: match found.

**Step 5: Commit**
```bash
git add apps/web/i18n/locales/en.json apps/web/i18n/locales/vi.json apps/web/i18n/locales/zh.json apps/web/i18n/locales/jp.json apps/web/i18n/locales/kr.json
git commit -m "docs(i18n): add public nav labels"
```

### Task 2: Add Features page i18n copy (all locales)

**Files:**
- Modify: `apps/web/i18n/locales/en.json`
- Modify: `apps/web/i18n/locales/vi.json`
- Modify: `apps/web/i18n/locales/zh.json`
- Modify: `apps/web/i18n/locales/jp.json`
- Modify: `apps/web/i18n/locales/kr.json`

**Step 1: Write the failing test**
Run:
```bash
rg -n "\"features\"\s*:\s*\{[^}]*\"hero\"" -U apps/web/i18n/locales/en.json
```
Expected: no matches.

**Step 2: Run test to verify it fails**
Same as Step 1 (no matches).

**Step 3: Write minimal implementation**
Add under `public` in each locale file.

`apps/web/i18n/locales/en.json`:
```json
"features": {
  "hero": {
    "title": "Everything you need to read smarter",
    "subtitle": "NewsFlow turns noisy feeds into clear, prioritized summaries so you can stay informed in minutes.",
    "cta": "Start free"
  },
  "grid": {
    "title": "Features built for focus",
    "items": {
      "personalized": {
        "title": "Personalized by your interests",
        "description": "Follow the topics you care about and skip the rest."
      },
      "summaries": {
        "title": "Clear, compact summaries",
        "description": "Get the key points fast with consistent highlights."
      },
      "priority": {
        "title": "Priority reading",
        "description": "Sort by urgency and relevance."
      },
      "openRss": {
        "title": "Open RSS, no lock-in",
        "description": "Use the sources you already trust."
      },
      "privacy": {
        "title": "Privacy-first by design",
        "description": "Your data stays yours. No ads, no selling."
      },
      "speed": {
        "title": "Fast, lightweight",
        "description": "Loads quickly on any device."
      }
    }
  },
  "finalCta": {
    "title": "Ready to read with less noise?",
    "subtitle": "Build your feed and start in minutes.",
    "cta": "Start free"
  }
}
```

`apps/web/i18n/locales/vi.json`:
```json
"features": {
  "hero": {
    "title": "Mọi thứ bạn cần để đọc thông minh hơn",
    "subtitle": "NewsFlow biến feed nhiễu thành bản tóm tắt ưu tiên rõ ràng để bạn cập nhật trong vài phút.",
    "cta": "Bắt đầu miễn phí"
  },
  "grid": {
    "title": "Tính năng giúp bạn tập trung",
    "items": {
      "personalized": {
        "title": "Cá nhân hóa theo sở thích",
        "description": "Theo dõi chủ đề bạn quan tâm và bỏ qua phần còn lại."
      },
      "summaries": {
        "title": "Tóm tắt rõ, gọn",
        "description": "Nắm ý chính nhanh với điểm nhấn nhất quán."
      },
      "priority": {
        "title": "Đọc theo ưu tiên",
        "description": "Sắp xếp theo độ khẩn và liên quan."
      },
      "openRss": {
        "title": "RSS mở, không khóa",
        "description": "Dùng nguồn bạn đã tin tưởng."
      },
      "privacy": {
        "title": "Quyền riêng tư là ưu tiên",
        "description": "Dữ liệu thuộc về bạn. Không quảng cáo, không bán."
      },
      "speed": {
        "title": "Nhanh và nhẹ",
        "description": "Tải nhanh trên mọi thiết bị."
      }
    }
  },
  "finalCta": {
    "title": "Sẵn sàng đọc ít nhiễu hơn?",
    "subtitle": "Xây feed của bạn và bắt đầu trong vài phút.",
    "cta": "Bắt đầu miễn phí"
  }
}
```

`apps/web/i18n/locales/zh.json`:
```json
"features": {
  "hero": {
    "title": "用更聪明的方式阅读",
    "subtitle": "NewsFlow 把嘈杂的订阅变成清晰的优先级摘要，让你几分钟内掌握重点。",
    "cta": "免费开始"
  },
  "grid": {
    "title": "专注阅读的功能",
    "items": {
      "personalized": {
        "title": "按兴趣个性化",
        "description": "只关注你在意的主题，其余自动淡出。"
      },
      "summaries": {
        "title": "清晰精炼的摘要",
        "description": "用一致的重点快速获取关键信息。"
      },
      "priority": {
        "title": "按优先级阅读",
        "description": "根据紧急度和相关度排序。"
      },
      "openRss": {
        "title": "开放 RSS，不锁定",
        "description": "继续使用你信任的来源。"
      },
      "privacy": {
        "title": "隐私优先",
        "description": "数据属于你，无广告、不出售。"
      },
      "speed": {
        "title": "快速轻量",
        "description": "任何设备上都能迅速加载。"
      }
    }
  },
  "finalCta": {
    "title": "准备好减少噪音了吗？",
    "subtitle": "创建你的订阅流，几分钟即可开始。",
    "cta": "免费开始"
  }
}
```

`apps/web/i18n/locales/jp.json`:
```json
"features": {
  "hero": {
    "title": "賢く読むための機能をすべて",
    "subtitle": "NewsFlow が雑多なフィードを優先度の高い要約に変え、数分で把握できます。",
    "cta": "無料で始める"
  },
  "grid": {
    "title": "集中できる機能",
    "items": {
      "personalized": {
        "title": "興味に合わせて最適化",
        "description": "関心のあるトピックだけを追えます。"
      },
      "summaries": {
        "title": "わかりやすい要約",
        "description": "一貫したハイライトで重要点を素早く把握。"
      },
      "priority": {
        "title": "優先度で読む",
        "description": "重要度と関連度で整理。"
      },
      "openRss": {
        "title": "オープンRSS、ロックインなし",
        "description": "信頼できるソースをそのまま使えます。"
      },
      "privacy": {
        "title": "プライバシー重視",
        "description": "データはあなたのもの。広告・販売なし。"
      },
      "speed": {
        "title": "軽快で高速",
        "description": "どのデバイスでも素早く表示。"
      }
    }
  },
  "finalCta": {
    "title": "ノイズを減らして読み始めませんか？",
    "subtitle": "自分のフィードを作り、数分で開始。",
    "cta": "無料で始める"
  }
}
```

`apps/web/i18n/locales/kr.json`:
```json
"features": {
  "hero": {
    "title": "더 똑똑하게 읽기 위한 모든 것",
    "subtitle": "NewsFlow는 복잡한 피드를 우선순위 요약으로 바꿔 몇 분 안에 핵심을 파악하게 합니다.",
    "cta": "무료로 시작"
  },
  "grid": {
    "title": "집중을 위한 기능",
    "items": {
      "personalized": {
        "title": "관심사 맞춤화",
        "description": "관심 있는 주제만 따라갑니다."
      },
      "summaries": {
        "title": "명확하고 간결한 요약",
        "description": "일관된 하이라이트로 핵심을 빠르게 파악합니다."
      },
      "priority": {
        "title": "우선순위로 읽기",
        "description": "긴급도와 관련도로 정렬합니다."
      },
      "openRss": {
        "title": "오픈 RSS, 락인 없음",
        "description": "신뢰하는 소스를 그대로 사용합니다."
      },
      "privacy": {
        "title": "프라이버시 우선",
        "description": "데이터는 당신의 것. 광고/판매 없음."
      },
      "speed": {
        "title": "빠르고 가벼움",
        "description": "어떤 기기에서도 빠르게 로드됩니다."
      }
    }
  },
  "finalCta": {
    "title": "노이즈를 줄이고 시작할까요?",
    "subtitle": "나만의 피드를 만들고 몇 분 안에 시작하세요.",
    "cta": "무료로 시작"
  }
}
```

**Step 4: Run test to verify it passes**
Run:
```bash
rg -n "\"features\"\s*:\s*\{[^}]*\"hero\"" -U apps/web/i18n/locales/en.json
```
Expected: match found.

**Step 5: Commit**
```bash
git add apps/web/i18n/locales/en.json apps/web/i18n/locales/vi.json apps/web/i18n/locales/zh.json apps/web/i18n/locales/jp.json apps/web/i18n/locales/kr.json
git commit -m "docs(i18n): add features page copy"
```

### Task 3: Add About page i18n copy (all locales)

**Files:**
- Modify: `apps/web/i18n/locales/en.json`
- Modify: `apps/web/i18n/locales/vi.json`
- Modify: `apps/web/i18n/locales/zh.json`
- Modify: `apps/web/i18n/locales/jp.json`
- Modify: `apps/web/i18n/locales/kr.json`

**Step 1: Write the failing test**
Run:
```bash
rg -n "\"about\"\s*:\s*\{[^}]*\"hero\"" -U apps/web/i18n/locales/en.json
```
Expected: no matches.

**Step 2: Run test to verify it fails**
Same as Step 1 (no matches).

**Step 3: Write minimal implementation**
Add under `public` in each locale file.

`apps/web/i18n/locales/en.json`:
```json
"about": {
  "hero": {
    "title": "We help you read with clarity",
    "subtitle": "NewsFlow is built for individuals who want trustworthy, focused news without the noise."
  },
  "mission": {
    "title": "Our mission",
    "body": "Make daily news simpler: clear summaries, honest sources, and time back for you."
  },
  "story": {
    "title": "Our story",
    "body": "NewsFlow started as a personal tool to manage too many feeds. We built a calmer way to keep up without scrolling for hours."
  },
  "values": {
    "title": "Our values",
    "items": {
      "clarity": {
        "title": "Clarity over volume",
        "description": "Summaries should save time, not create more noise."
      },
      "trust": {
        "title": "Trust and transparency",
        "description": "We keep sources visible and let you open the originals."
      },
      "privacy": {
        "title": "Privacy by default",
        "description": "We avoid invasive tracking and never sell your data."
      },
      "craft": {
        "title": "Careful craft",
        "description": "Small details make reading feel effortless."
      }
    }
  },
  "trust": {
    "title": "Privacy & trust",
    "body": "We don’t sell data. We limit tracking to what’s essential for the product."
  },
  "finalCta": {
    "title": "Join readers who want less noise",
    "subtitle": "Start free and build your personal feed.",
    "cta": "Start free"
  }
}
```

`apps/web/i18n/locales/vi.json`:
```json
"about": {
  "hero": {
    "title": "Giúp bạn đọc rõ ràng hơn",
    "subtitle": "NewsFlow dành cho người muốn tin tức đáng tin cậy và tập trung, không bị nhiễu."
  },
  "mission": {
    "title": "Sứ mệnh",
    "body": "Đơn giản hóa việc đọc tin hằng ngày: tóm tắt rõ ràng, nguồn minh bạch, trả lại thời gian cho bạn."
  },
  "story": {
    "title": "Câu chuyện",
    "body": "NewsFlow bắt đầu từ nhu cầu cá nhân khi có quá nhiều feed. Chúng tôi tạo cách cập nhật bình tĩnh hơn mà không phải cuộn hàng giờ."
  },
  "values": {
    "title": "Giá trị cốt lõi",
    "items": {
      "clarity": {
        "title": "Ưu tiên sự rõ ràng",
        "description": "Tóm tắt phải tiết kiệm thời gian, không tạo thêm nhiễu."
      },
      "trust": {
        "title": "Tin cậy và minh bạch",
        "description": "Luôn hiển thị nguồn và cho bạn mở bài gốc."
      },
      "privacy": {
        "title": "Riêng tư mặc định",
        "description": "Hạn chế tracking và không bán dữ liệu."
      },
      "craft": {
        "title": "Chăm chút trải nghiệm",
        "description": "Tiểu tiết tốt giúp việc đọc nhẹ nhàng."
      }
    }
  },
  "trust": {
    "title": "Riêng tư & tin cậy",
    "body": "Chúng tôi không bán dữ liệu và chỉ tracking tối thiểu cần thiết."
  },
  "finalCta": {
    "title": "Tham gia cộng đồng đọc ít nhiễu",
    "subtitle": "Bắt đầu miễn phí và tạo feed cá nhân.",
    "cta": "Bắt đầu miễn phí"
  }
}
```

`apps/web/i18n/locales/zh.json`:
```json
"about": {
  "hero": {
    "title": "让你阅读更清晰",
    "subtitle": "NewsFlow 面向个人用户，提供可信、专注、没有噪音的新闻体验。"
  },
  "mission": {
    "title": "使命",
    "body": "让每天的新闻更简单：清晰摘要、可信来源、把时间还给你。"
  },
  "story": {
    "title": "故事",
    "body": "NewsFlow 起初是为了解决个人过多订阅的问题，我们希望用更平静的方式保持更新。"
  },
  "values": {
    "title": "价值观",
    "items": {
      "clarity": {
        "title": "清晰优先",
        "description": "摘要应节省时间，而不是增加噪音。"
      },
      "trust": {
        "title": "信任与透明",
        "description": "始终显示来源，随时可查看原文。"
      },
      "privacy": {
        "title": "默认隐私",
        "description": "减少追踪，从不出售数据。"
      },
      "craft": {
        "title": "精心打磨",
        "description": "细节决定阅读体验。"
      }
    }
  },
  "trust": {
    "title": "隐私与信任",
    "body": "我们不出售数据，只保留产品所需的最少追踪。"
  },
  "finalCta": {
    "title": "加入想要更少噪音的读者",
    "subtitle": "免费开始，打造你的个人订阅流。",
    "cta": "免费开始"
  }
}
```

`apps/web/i18n/locales/jp.json`:
```json
"about": {
  "hero": {
    "title": "読みやすさを届ける",
    "subtitle": "NewsFlow は個人向けに、信頼できるニュース体験を提供します。"
  },
  "mission": {
    "title": "ミッション",
    "body": "毎日のニュースをシンプルに。明快な要約、透明なソース、時間を取り戻す。"
  },
  "story": {
    "title": "ストーリー",
    "body": "NewsFlow は大量のフィードに疲れた個人の課題から生まれました。落ち着いて追える体験を目指しています。"
  },
  "values": {
    "title": "私たちの価値観",
    "items": {
      "clarity": {
        "title": "明快さを優先",
        "description": "要約は時間を節約し、ノイズを増やさない。"
      },
      "trust": {
        "title": "信頼と透明性",
        "description": "ソースを明示し、原文へいつでもアクセス。"
      },
      "privacy": {
        "title": "プライバシーが標準",
        "description": "追跡を最小限にし、データは販売しない。"
      },
      "craft": {
        "title": "丁寧なつくり",
        "description": "細部が読書体験を支える。"
      }
    }
  },
  "trust": {
    "title": "プライバシーと信頼",
    "body": "データは売らず、必要最小限の計測のみ。"
  },
  "finalCta": {
    "title": "ノイズを減らしたい読者へ",
    "subtitle": "無料で始めて、自分のフィードを作ろう。",
    "cta": "無料で始める"
  }
}
```

`apps/web/i18n/locales/kr.json`:
```json
"about": {
  "hero": {
    "title": "더 명확하게 읽도록 돕습니다",
    "subtitle": "NewsFlow는 개인을 위해 신뢰할 수 있는 집중형 뉴스 경험을 제공합니다."
  },
  "mission": {
    "title": "미션",
    "body": "매일의 뉴스를 단순하게: 명확한 요약, 투명한 소스, 시간을 돌려드립니다."
  },
  "story": {
    "title": "이야기",
    "body": "NewsFlow는 너무 많은 피드에 지친 개인의 문제에서 시작했습니다. 차분하게 따라갈 수 있는 경험을 만들었습니다."
  },
  "values": {
    "title": "가치",
    "items": {
      "clarity": {
        "title": "명확함 우선",
        "description": "요약은 시간을 절약해야지 노이즈를 늘리면 안 됩니다."
      },
      "trust": {
        "title": "신뢰와 투명성",
        "description": "소스를 명확히 보여주고 원문을 언제든 열 수 있습니다."
      },
      "privacy": {
        "title": "기본 프라이버시",
        "description": "추적을 최소화하고 데이터를 판매하지 않습니다."
      },
      "craft": {
        "title": "세심한 제작",
        "description": "작은 디테일이 읽기 경험을 좌우합니다."
      }
    }
  },
  "trust": {
    "title": "프라이버시 & 신뢰",
    "body": "데이터를 판매하지 않으며 필요한 최소한만 추적합니다."
  },
  "finalCta": {
    "title": "노이즈를 줄이고 싶은 독자에게",
    "subtitle": "무료로 시작해 개인 피드를 만들어 보세요.",
    "cta": "무료로 시작"
  }
}
```

**Step 4: Run test to verify it passes**
Run:
```bash
rg -n "\"about\"\s*:\s*\{[^}]*\"hero\"" -U apps/web/i18n/locales/en.json
```
Expected: match found.

**Step 5: Commit**
```bash
git add apps/web/i18n/locales/en.json apps/web/i18n/locales/vi.json apps/web/i18n/locales/zh.json apps/web/i18n/locales/jp.json apps/web/i18n/locales/kr.json
git commit -m "docs(i18n): add about page copy"
```

### Task 4: Create public layout + island header component

**Files:**
- Create: `apps/web/app/components/PublicHeader.vue`
- Create: `apps/web/app/layouts/public.vue`

**Step 1: Write the failing test**
Run:
```bash
rg -n "PublicHeader" apps/web/app/components/PublicHeader.vue
```
Expected: file not found.

**Step 2: Run test to verify it fails**
Same as Step 1 (no file).

**Step 3: Write minimal implementation**

`apps/web/app/components/PublicHeader.vue`:
```vue
<script setup lang="ts">
import { Menu } from "lucide-vue-next";
import { computed, ref } from "vue";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isAppLocale } from "@/lib/i18n";

const { t, locale, locales, setLocale } = useI18n();
const mobileOpen = ref(false);

const navItems = [
  { labelKey: "public.nav.home", href: "/" },
  { labelKey: "public.nav.features", href: "/features" },
  { labelKey: "public.nav.pricing", href: "/pricing" },
  { labelKey: "public.nav.about", href: "/about" },
];

const languageOptions = computed(() =>
  locales.value.map((item) => {
    const code = typeof item === "string" ? item : item.code;
    return { code, label: t(`locale.options.${code}`) };
  })
);

const currentLanguageLabel = computed(
  () =>
    languageOptions.value.find((item) => item.code === locale.value)?.label ??
    t("locale.label")
);

const handleLanguageChange = async (value: unknown) => {
  if (typeof value !== "string") return;
  if (!isAppLocale(value)) return;
  await setLocale(value);
};
</script>

<template>
  <div class="sticky top-4 z-40">
    <div class="mx-auto w-full max-w-6xl px-6">
      <div class="flex items-center justify-between gap-4 rounded-2xl border bg-card/95 px-5 py-3 shadow-sm backdrop-blur">
        <NuxtLink to="/" class="text-sm font-semibold tracking-wide">
          {{ t("app.name") }}
        </NuxtLink>

        <nav class="hidden items-center gap-6 text-sm font-medium md:flex">
          <NuxtLink
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            class="text-muted-foreground transition hover:text-foreground"
          >
            {{ t(item.labelKey) }}
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm" class="hidden md:inline-flex">
                {{ currentLanguageLabel }}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="min-w-40 rounded-xl">
              <DropdownMenuRadioGroup
                :model-value="locale"
                @update:model-value="handleLanguageChange"
              >
                <DropdownMenuRadioItem
                  v-for="option in languageOptions"
                  :key="option.code"
                  :value="option.code"
                >
                  {{ option.label }}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button as-child size="sm" class="hidden md:inline-flex">
            <NuxtLink to="/signup">
              {{ t("public.nav.cta") }}
            </NuxtLink>
          </Button>

          <Sheet :open="mobileOpen" @update:open="(value) => (mobileOpen = value)">
            <SheetTrigger as-child>
              <Button variant="outline" size="sm" class="md:hidden">
                <Menu class="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" class="w-72">
              <SheetHeader>
                <SheetTitle>{{ t("app.name") }}</SheetTitle>
              </SheetHeader>
              <div class="mt-6 flex flex-col gap-4">
                <NuxtLink
                  v-for="item in navItems"
                  :key="item.href"
                  :to="item.href"
                  class="text-sm font-medium"
                  @click="mobileOpen = false"
                >
                  {{ t(item.labelKey) }}
                </NuxtLink>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="outline" size="sm" class="justify-start">
                      {{ currentLanguageLabel }}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" class="min-w-40 rounded-xl">
                    <DropdownMenuRadioGroup
                      :model-value="locale"
                      @update:model-value="handleLanguageChange"
                    >
                      <DropdownMenuRadioItem
                        v-for="option in languageOptions"
                        :key="option.code"
                        :value="option.code"
                      >
                        {{ option.label }}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button as-child size="sm">
                  <NuxtLink to="/signup">{{ t("public.nav.cta") }}</NuxtLink>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  </div>
</template>
```

`apps/web/app/layouts/public.vue`:
```vue
<template>
  <div class="min-h-screen bg-background text-foreground">
    <PublicHeader />
    <main class="pt-6">
      <slot />
    </main>
  </div>
</template>
```

**Step 4: Run test to verify it passes**
Run:
```bash
rg -n "PublicHeader" apps/web/app/components/PublicHeader.vue
```
Expected: match found.

**Step 5: Commit**
```bash
git add apps/web/app/components/PublicHeader.vue apps/web/app/layouts/public.vue
git commit -m "feat(web): add public layout and island header"
```

### Task 5: Apply public layout to landing and pricing pages

**Files:**
- Modify: `apps/web/app/pages/index.vue`
- Modify: `apps/web/app/pages/pricing.vue`

**Step 1: Write the failing test**
Run:
```bash
rg -n "layout: \"public\"" apps/web/app/pages/index.vue apps/web/app/pages/pricing.vue
```
Expected: no matches.

**Step 2: Run test to verify it fails**
Same as Step 1 (no matches).

**Step 3: Write minimal implementation**

Add to `apps/web/app/pages/index.vue` inside `<script setup>` (keep existing logic):
```ts
definePageMeta({ layout: "public" });
```

Add to `apps/web/app/pages/pricing.vue` inside `<script setup>`:
```ts
definePageMeta({ layout: "public" });
```

**Step 4: Run test to verify it passes**
Run:
```bash
rg -n "layout: \"public\"" apps/web/app/pages/index.vue apps/web/app/pages/pricing.vue
```
Expected: matches found.

**Step 5: Commit**
```bash
git add apps/web/app/pages/index.vue apps/web/app/pages/pricing.vue
git commit -m "feat(web): apply public layout"
```

### Task 6: Create Features page

**Files:**
- Create: `apps/web/app/pages/features.vue`

**Step 1: Write the failing test**
Run:
```bash
rg -n "public.features.hero" apps/web/app/pages/features.vue
```
Expected: file not found.

**Step 2: Run test to verify it fails**
Same as Step 1 (no file).

**Step 3: Write minimal implementation**

`apps/web/app/pages/features.vue`:
```vue
<script setup lang="ts">
const { t } = useI18n();

definePageMeta({ layout: "public" });

const featureItems = [
  "personalized",
  "summaries",
  "priority",
  "openRss",
  "privacy",
  "speed",
];
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 pb-16">
    <section class="grid gap-8 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div class="space-y-5">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {{ t("app.name") }}
        </p>
        <h1 class="landing-title text-4xl font-semibold leading-tight sm:text-5xl">
          {{ t("public.features.hero.title") }}
        </h1>
        <p class="text-lg text-muted-foreground">
          {{ t("public.features.hero.subtitle") }}
        </p>
        <NuxtLink
          to="/signup"
          class="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {{ t("public.features.hero.cta") }}
        </NuxtLink>
      </div>
      <div class="rounded-2xl border bg-card p-6 shadow-sm">
        <div class="space-y-3">
          <p class="text-xs uppercase tracking-widest text-muted-foreground">
            {{ t("public.home.demo.summaryLabel") }}
          </p>
          <ul class="space-y-2 text-sm">
            <li>• {{ t("public.home.demo.bullets.one") }}</li>
            <li>• {{ t("public.home.demo.bullets.two") }}</li>
            <li>• {{ t("public.home.demo.bullets.three") }}</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="mt-14">
      <div class="flex items-center justify-between">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.features.grid.title") }}
        </h2>
      </div>
      <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="item in featureItems"
          :key="item"
          class="rounded-2xl border bg-card p-6"
        >
          <h3 class="text-lg font-semibold">
            {{ t(`public.features.grid.items.${item}.title`) }}
          </h3>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ t(`public.features.grid.items.${item}.description`) }}
          </p>
        </div>
      </div>
    </section>

    <section class="mt-14 rounded-2xl border bg-card p-6">
      <h2 class="landing-title text-2xl font-semibold">
        {{ t("public.home.howItWorks.title") }}
      </h2>
      <div class="mt-6 grid gap-6 md:grid-cols-3">
        <div class="space-y-2">
          <div class="text-sm font-semibold">
            {{ t("public.home.howItWorks.steps.add.title") }}
          </div>
          <p class="text-sm text-muted-foreground">
            {{ t("public.home.howItWorks.steps.add.description") }}
          </p>
        </div>
        <div class="space-y-2">
          <div class="text-sm font-semibold">
            {{ t("public.home.howItWorks.steps.summarize.title") }}
          </div>
          <p class="text-sm text-muted-foreground">
            {{ t("public.home.howItWorks.steps.summarize.description") }}
          </p>
        </div>
        <div class="space-y-2">
          <div class="text-sm font-semibold">
            {{ t("public.home.howItWorks.steps.read.title") }}
          </div>
          <p class="text-sm text-muted-foreground">
            {{ t("public.home.howItWorks.steps.read.description") }}
          </p>
        </div>
      </div>
    </section>

    <section class="mt-14 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div class="space-y-3">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.home.demo.title") }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ t("public.home.demo.subtitle") }}
        </p>
      </div>
      <div class="rounded-2xl border bg-card p-6">
        <p class="text-xs uppercase tracking-widest text-muted-foreground">
          {{ t("public.home.demo.highlightsLabel") }}
        </p>
        <ul class="mt-3 space-y-2 text-sm">
          <li>• {{ t("public.home.demo.bullets.one") }}</li>
          <li>• {{ t("public.home.demo.bullets.two") }}</li>
          <li>• {{ t("public.home.demo.bullets.three") }}</li>
        </ul>
      </div>
    </section>

    <section class="mt-14">
      <div class="rounded-2xl border bg-card p-8 text-center">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.features.finalCta.title") }}
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ t("public.features.finalCta.subtitle") }}
        </p>
        <NuxtLink
          to="/signup"
          class="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {{ t("public.features.finalCta.cta") }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
```

**Step 4: Run test to verify it passes**
Run:
```bash
rg -n "public.features.hero" apps/web/app/pages/features.vue
```
Expected: match found.

**Step 5: Commit**
```bash
git add apps/web/app/pages/features.vue
git commit -m "feat(web): add features page"
```

### Task 7: Create About page

**Files:**
- Create: `apps/web/app/pages/about.vue`

**Step 1: Write the failing test**
Run:
```bash
rg -n "public.about.hero" apps/web/app/pages/about.vue
```
Expected: file not found.

**Step 2: Run test to verify it fails**
Same as Step 1 (no file).

**Step 3: Write minimal implementation**

`apps/web/app/pages/about.vue`:
```vue
<script setup lang="ts">
const { t } = useI18n();

definePageMeta({ layout: "public" });

const valueItems = [
  "clarity",
  "trust",
  "privacy",
  "craft",
];
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 pb-16">
    <section class="space-y-5 pt-12">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {{ t("app.name") }}
      </p>
      <h1 class="landing-title text-4xl font-semibold leading-tight sm:text-5xl">
        {{ t("public.about.hero.title") }}
      </h1>
      <p class="text-lg text-muted-foreground">
        {{ t("public.about.hero.subtitle") }}
      </p>
    </section>

    <section class="mt-12 grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.about.mission.title") }}
        </h2>
        <p class="mt-3 text-sm text-muted-foreground">
          {{ t("public.about.mission.body") }}
        </p>
      </div>
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.about.story.title") }}
        </h2>
        <p class="mt-3 text-sm text-muted-foreground">
          {{ t("public.about.story.body") }}
        </p>
      </div>
    </section>

    <section class="mt-12">
      <h2 class="landing-title text-2xl font-semibold">
        {{ t("public.about.values.title") }}
      </h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-2">
        <div
          v-for="item in valueItems"
          :key="item"
          class="rounded-2xl border bg-card p-6"
        >
          <h3 class="text-lg font-semibold">
            {{ t(`public.about.values.items.${item}.title`) }}
          </h3>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ t(`public.about.values.items.${item}.description`) }}
          </p>
        </div>
      </div>
    </section>

    <section class="mt-12">
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.about.trust.title") }}
        </h2>
        <p class="mt-3 text-sm text-muted-foreground">
          {{ t("public.about.trust.body") }}
        </p>
      </div>
    </section>

    <section class="mt-12">
      <div class="rounded-2xl border bg-card p-8 text-center">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.about.finalCta.title") }}
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ t("public.about.finalCta.subtitle") }}
        </p>
        <NuxtLink
          to="/signup"
          class="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {{ t("public.about.finalCta.cta") }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
```

**Step 4: Run test to verify it passes**
Run:
```bash
rg -n "public.about.hero" apps/web/app/pages/about.vue
```
Expected: match found.

**Step 5: Commit**
```bash
git add apps/web/app/pages/about.vue
git commit -m "feat(web): add about page"
```

### Task 8: Manual QA + type check

**Files:**
- None

**Step 1: Write the failing test**
Checklist:
- Header shows logo, nav, language, CTA on desktop.
- Mobile header menu opens and shows nav + language + CTA.
- `/features` and `/about` render with all sections.
- No missing i18n keys on public pages.

**Step 2: Run test to verify it fails**
Run: `bun run check-types` (expected: PASS). Then manually check the checklist.

**Step 3: Write minimal implementation**
Fix any issues found during manual QA.

**Step 4: Run test to verify it passes**
Re-check the pages on mobile and desktop.

**Step 5: Commit**
```bash
git add apps/web/app apps/web/i18n/locales/*.json
git commit -m "chore(web): polish public pages QA fixes"
```
