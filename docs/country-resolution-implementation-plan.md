# Country Resolution Implementation Plan

Muc tieu: Xac dinh `countryCode` khi user dang nhap/mo app theo thu tu uu tien:
1. Phone number (E.164) -> countryCode
2. IP lookup -> countryCode
3. Accept-Language -> countryCode
4. Default `GLOBAL` (hoac `EN` neu can)

## Tracking Rule
- Moi phan hoan thanh: danh dau `[x]` va commit ngay phan do.
- Khong gom nhieu phan khong lien quan vao cung mot commit.
- Commit message de xuat duoc ghi tai tung phan.

---

## Part 0 - Preparation
- [x] Xac nhan dang lam viec tren nhanh dung (`feature/admin-discover-management`).
- [x] Chot gia tri default: `GLOBAL` (khuyen nghi).
- [x] Chot field luu ket qua: `user.countryCode` va optional `countrySource`.

Commit message de xuat:
- `chore(country): define country resolution defaults and tracking`

## Part 1 - Data Model + Migration
- [x] Them truong `phoneNumber` (neu chua co) va `countryCode` vao user schema.
- [x] (Khuyen nghi) Them `countrySource` enum: `PHONE | IP | ACCEPT_LANGUAGE | DEFAULT`.
- [x] Tao migration Prisma.
- [x] Chay generate client.

Acceptance:
- User model co field can thiet.
- Migration ap dung duoc.

Commit message de xuat:
- `feat(country): add user country fields and migration`

## Part 2 - Phone Parsing Layer (Highest Priority)
- [x] Them service `resolveCountryFromPhone(phoneNumber)`.
- [x] Parse E.164 bang `google-libphonenumber` (hoac thu vien tuong duong).
- [x] Tra ve ISO alpha-2 (VD `VN`, `US`) neu parse thanh cong.
- [x] Fail-safe: parse loi thi tra `null`, khong throw lam do luong chinh.

Acceptance:
- Input `+84987654321` -> `VN`.
- So khong hop le -> `null`.

Commit message de xuat:
- `feat(country): resolve country from E.164 phone numbers`

## Part 3 - IP Fallback Layer
- [x] Them provider interface: `resolveCountryFromIp(ip)`.
- [x] Implement provider 1 (ipapi/ipinfo/MaxMind).
- [x] Xu ly timeout + retry nhe + fail-safe `null`.
- [x] Loai bo local IP/private IP (`127.0.0.1`, `::1`, `10.*`, `192.168.*`, ...).

Acceptance:
- IP public hop le tra ve ma quoc gia.
- Loi provider khong lam crash request.

Commit message de xuat:
- `feat(country): add IP-based country fallback resolver`

## Part 4 - Accept-Language Fallback Layer
- [x] Them parser `resolveCountryFromAcceptLanguage(header)`.
- [x] Uu tien locale co region (`vi-VN` -> `VN`, `en-US` -> `US`).
- [x] Neu chi co language (`vi`, `en`) thi map bang bang mapping an toan (optional).
- [x] Khong parse duoc -> `null`.

Acceptance:
- `vi-VN,vi;q=0.9,en;q=0.8` -> `VN`.
- Header rong/khong hop le -> `null`.

Commit message de xuat:
- `feat(country): add Accept-Language country fallback`

## Part 5 - Orchestration (Priority Chain)
- [x] Them ham trung tam `resolveUserCountry(context)` theo dung thu tu:
  1) phone
  2) ip
  3) accept-language
  4) default `GLOBAL`
- [x] Tra ve ca `countryCode` va `source`.
- [x] Ghi vao DB khi login/mo app (chi update neu thay doi hoac chua co).

Acceptance:
- Uu tien phone cao nhat.
- Neu phone null -> fallback ip -> fallback accept-language -> `GLOBAL`.

Commit message de xuat:
- `feat(country): orchestrate country resolution with ordered fallbacks`

## Part 6 - API Integration + Safe Logging
- [x] Tich hop vao luong session/login hoac middleware server.
- [x] Khong log du lieu nhay cam day du (phone/ip raw).
- [x] Them log context ngan gon: userId, source, countryCode.

Acceptance:
- User login/mo app co cap nhat countryCode on-demand.
- Log khong lo thong tin nhay cam.

Commit message de xuat:
- `feat(country): integrate country resolution into auth/session flow`

## Part 7 - Discover Usage
- [ ] Discover query dung `user.countryCode` + fallback `GLOBAL` feed.
- [ ] Neu user chua co countryCode thi trigger resolver chain.
- [ ] Co co che cache theo country (neu can trong pha nay).

Acceptance:
- User thay feed theo quoc gia + feed global.

Commit message de xuat:
- `feat(discover): use resolved country for localized feed selection`

## Part 8 - Tests
- [ ] Unit test parser phone.
- [ ] Unit test parser accept-language.
- [ ] Unit test orchestration priority chain.
- [ ] Integration test (mock IP provider) cho luong login/mo app.

Acceptance:
- Bao phu du cac nhanh fallback.

Commit message de xuat:
- `test(country): cover fallback priority and resolver behavior`

## Part 9 - Docs + Ops
- [ ] Cap nhat docs ve bien moi (neu co API key provider IP).
- [ ] Cap nhat runbook/README cho behavior fallback.
- [ ] Ghi ro default `GLOBAL` va ly do.

Commit message de xuat:
- `docs(country): add fallback flow and operational notes`

---

## Suggested Work Sequence
1. Part 0 -> 1 -> 2 -> 4 -> 5
2. Part 3
3. Part 6 -> 7
4. Part 8 -> 9

## Definition of Done (Feature)
- [ ] Resolver chain chay dung thu tu uu tien.
- [ ] DB co `countryCode` duoc cap nhat on-demand.
- [ ] Discover da su dung `countryCode` + fallback `GLOBAL`.
- [ ] Test pass cho logic fallback.
- [ ] Moi part da duoc tick va commit rieng.
