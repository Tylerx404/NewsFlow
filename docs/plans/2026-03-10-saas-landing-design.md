# NewsFlow SaaS Landing Page Design (Editorial Calm + Friendly)

## Context
- Product: NewsFlow - personalized news/RSS summaries for individuals.
- Primary audience: individual users.
- Primary CTA: sign up now.
- Brand tone: friendly and youthful, but still trustworthy.

## Goals
- Increase sign-ups from the landing page.
- Communicate value quickly: read faster, understand better, less noise.
- Build trust without heavy enterprise signals.

## Non-goals
- No enterprise/team positioning (reserved for later).
- No complex animations, video, or heavy interactive demos.
- No change to backend flows or pricing logic.

## Constraints
- All UI copy must go through i18n.
- Use existing design tokens from `apps/web/app/assets/css/main.css` (OKLCH vars).
- Prefer lightweight visuals and fast load.
- Layout should match SaaS patterns (clear hierarchy, generous spacing).

## Approach (Chosen)
**Editorial Calm + Friendly**
- Serif headlines for editorial feel and trust.
- Sans body text for clarity and speed of reading.
- Soft, friendly accents (subtle color highlight only).
- Content structure optimized for quick scanning.

## Information Architecture (Section Flow)
1. Hero
   - Headline: benefit-driven, short.
   - Subheadline: personalized summaries in minutes.
   - Primary CTA: Sign up now.
   - Secondary CTA: View demo.
   - Visual: newsfeed + summary card mockup.
2. Trust strip
   - Privacy-first, No spam, RSS open standard.
3. Benefits (3 blocks)
   - Personalization
   - Clear summaries
   - Less noise
4. How it works (3 steps)
   - Add sources → AI summary → Read by priority.
5. Demo preview
   - Static card with title + 3 bullet highlights.
6. Use cases (personal)
   - Morning briefing, industry tracking, end-of-day catch-up.
7. FAQ (short)
   - Need RSS? Summary accuracy? Data privacy?
8. Final CTA
   - Restated benefit + Sign up now.

## Visual Direction
- Typography
  - Headlines: serif with friendly tone.
  - Body: clean sans.
- Color
  - Light neutral base with card contrast.
  - One warm accent for CTA or highlight.
- Imagery
  - No stock photos.
  - Use UI mockup illustration (cards, list, tags).
- Motion
  - Subtle section reveals only.

## Content Tone
- Friendly, direct, no hype.
- Avoid generic AI buzzwords.
- Emphasize clarity, speed, and trust.

## i18n Impact
New keys will be required under `public.home` and possibly `public.landing`. Suggested groups:
- hero: title, subtitle, ctaPrimary, ctaSecondary
- trust: privacy, noSpam, rssOpen
- benefits: title, items
- howItWorks: title, steps
- demo: title, sampleSummary
- useCases: title, items
- faq: title, items
- finalCta: title, subtitle, button

## Components (Shadcn + Tailwind)
- `Card`, `Button`, `Badge`, `Separator` (if needed), `Accordion` for FAQ.
- Maintain spacing scale: `p-4/p-6`, `gap-4/gap-6`.

## Accessibility & Performance
- Ensure sufficient contrast with tokens.
- Keep images inline SVG or lightweight PNG.
- Avoid large background gradients; use accent highlights only.

## Risks
- Serif choice can feel too formal if overused. Limit to headlines.
- Landing can feel static without any animation; add minimal reveal.

## Success Metrics
- Sign-up click-through rate from hero and final CTA.
- Time-to-first-interaction under 2 seconds on mobile.

## Open Questions
- Exact copy for hero and FAQ (will be drafted during implementation).
- If demo preview should be interactive or static (recommend static for speed).
