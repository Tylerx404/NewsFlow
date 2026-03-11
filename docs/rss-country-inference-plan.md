# RSS Country Inference Plan (Language-First, Offline)

Muc tieu: Tu dong gan quoc gia cho RSS feed trong Discover ma khong can API ngoai.
Huong uu tien: Detect ngon ngu noi dung -> map heuristic sang country -> fallback GLOBAL.

## Scope
- Dung cho nguon feed Discover chung (khong tac dong feed private cua user tru khi co yeu cau).
- Khong goi third-party geo/language API.
- Chay offline trong backend/worker.

## Priority Rules
1. Detect ngon ngu tu noi dung feed (title + description + 3-5 items dau).
2. Map language -> country theo heuristic.
3. Neu confidence thap/khong ro -> fallback `GLOBAL`.

## V1 Caveats (Da chap nhan)
- `franc` co the yeu voi tieng Viet neu text ngan.
- `en -> GLOBAL` co the khien mot so feed VN tieng Anh bi map `GLOBAL`.
- Cache TTL 30-60 phut co the cham voi breaking news.

---

## Part A - Data Model
- [x] Them truong vao FeedSource (hoac bang lien quan):
  - `inferredLanguage` (string, nullable)
  - `inferredCountryCode` (string, nullable)
  - `inferenceConfidence` (float/int)
  - `inferenceSource` (enum: `LANG_DETECTION`, `MANUAL`, `DEFAULT`)
  - `inferredAt` (datetime)
- [x] Tao migration Prisma.
- [x] Them index cho `inferredCountryCode` de query Discover nhanh.

Acceptance:
- Query theo country cho Discover su dung duoc index.
- Co metadata de debug viec infer.

Commit goi y:
- `feat(feed): add inferred language/country metadata fields`

## Part B - Language Detection Engine
- [x] Chon thu vien: `franc` (uu tien) hoac `compact-language-detector`.
- [x] Tao service: `detectFeedLanguage(input)`.
- [x] Input gom:
  - feed title
  - feed description
  - 3-5 item dau (title + summary)
- [x] Normalize text (lowercase, remove html, collapse spaces).
- [x] Return:
  - `language` (ISO code, vd: `vi`, `en`, `fr`)
  - `confidence`
  - `sampleSize`
- [x] Neu qua ngan/nhieu ky tu noise -> `null`.
- [x] Them rule threshold rieng cho `vi` (neu dung `franc`) de giam false negative voi text ngan.

Acceptance:
- Feed tieng Viet detect ra `vi`.
- Feed tieng Anh detect ra `en`.
- Feed qua it text -> `null`.

Commit goi y:
- `feat(feed): implement offline language detection for rss`

## Part C - Language -> Country Heuristic
- [x] Tao mapping co ban:
  - `vi -> VN`
  - `th -> TH`
  - `id -> ID`
  - `fr -> FR`
  - `de -> DE`
  - `es -> ES` (co the mo rong `ES/MX` sau)
  - `en -> GLOBAL` (khuyen nghi de trung lap)
- [x] Dat rule cho ngon ngu da quoc gia (`en`, `es`, `pt`, `ar`):
  - default ve `GLOBAL` trong V1.
- [x] Ghi ro trong docs: feed VN viet tieng Anh co the vao `GLOBAL` o V1.
- [x] Tao function: `mapLanguageToCountry(language, options)`.

Acceptance:
- Mapping don gian, de doc, de chinh sua.
- `en` khong ep vao US/GB neu chua co tin hieu bo sung.

Commit goi y:
- `feat(feed): add language-to-country heuristic mapping`

## Part D - Inference Orchestrator
- [x] Tao flow `inferFeedCountry(feed)`:
  1) detect language
  2) map country
  3) set confidence + source
  4) fallback GLOBAL neu khong du du lieu
- [x] Luu ket qua vao DB.
- [ ] Chi update neu ket qua thay doi hoac qua han refresh.

Acceptance:
- Feed moi tao se co inferred country.
- Feed cu co job re-infer theo lich.

Commit goi y:
- `feat(feed): orchestrate rss country inference pipeline`

## Part E - Worker Integration
- [x] Gan inference vao luc:
  - add feed moi
  - refresh feed metadata
  - batch reindex
- [x] Dat guard de khong lam cham pipeline fetch article.
- [x] Retry nhe neu loi parse XML/noi dung.

Acceptance:
- Khong block job fetch chinh.
- Loi inference khong lam fail toan job.

Commit goi y:
- `feat(worker): integrate feed country inference into refresh jobs`

## Part F - Admin Override
- [x] Trong admin feed detail, cho phep set manual country.
- [x] Khi manual override:
  - `inferenceSource = MANUAL`
  - bo qua auto overwrite (hoac overwrite co flag force)
- [x] Hien language/country inferred de admin review.

Acceptance:
- Admin co the chinh tay khi heuristic sai.

Commit goi y:
- `feat(admin): allow manual country override for inferred feeds`

## Part G - Discover Query Usage
- [x] Discover lay feed theo:
  - country exact match
  - union voi `GLOBAL`
- [x] Sap xep uu tien:
  - exact country > global
  - trending > fresh > random diversify
- [x] Cache theo country:
  - key: `discover:feeds:{country}`
  - TTL 30-60 phut (configurable theo country)

Acceptance:
- User country `VN` thay feed `VN` + `GLOBAL`.
- Country khong co feed van co GLOBAL.

Commit goi y:
- `feat(discover): use inferred feed country with global fallback`

## Part H - Quality & Monitoring
- [x] Them dashboard metric:
  - `% feed inferred thanh cong`
  - `% feed GLOBAL`
  - `% manual override`
- [x] Log ngan gon khi infer:
  - feedId, language, country, confidence, source
- [x] Khong log full content feed.
- [x] Track rieng metric feed `en` tu domain `.vn` de xu ly o phase tiep theo.

Acceptance:
- Co so lieu de tune mapping va confidence threshold.

Commit goi y:
- `chore(feed): add inference metrics and safe logs`

## Part I - Test Plan
- [x] Unit test detect language voi bo sample:
  - vi, en, fr, de, th, id
- [x] Unit test mapping language->country.
- [ ] Integration test pipeline infer + persist.
- [ ] Regression test Discover fallback GLOBAL.

Acceptance:
- Pass test cho luong infer va discover filter.

Commit goi y:
- `test(feed): cover rss language inference and country fallback`

---

## Suggested Rollout
1. MVP: Part A + B + C + D + G
2. Stability: Part E + I
3. Operability: Part F + H
4. Phase 2: them domain heuristic (`.vn -> VN`) cho feed `en`.

## Default Heuristic (V1)
- Tin hieu ro rang language quoc gia don: map thang country.
- Language da quoc gia: `GLOBAL`.
- Khong detect duoc: `GLOBAL`.

## Phase 2 Heuristic (Planned)
- Neu language = `en` va domain feed ket thuc bang `.vn` thi uu tien `VN`.

## DoD
- [ ] Feed moi duoc infer language/country tu dong.
- [ ] Discover dung inferred country + GLOBAL fallback.
- [ ] Admin co override tay.
- [ ] Co test va metric de danh gia do chinh xac.
- [ ] Feed tieng Anh tu domain `.vn` duoc ghi nhan metric/debt item de xu ly phase 2.
