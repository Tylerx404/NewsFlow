# Stripe Setup (Sandbox)

Tai lieu nay dung de setup nhanh Stripe sandbox cho NewsFlow.

## 1) Tao Stripe sandbox

1. Dang nhap Stripe Dashboard.
2. Tao hoac chon mot sandbox environment.
3. Vao `Developers > API keys` trong sandbox va copy:
   - `Secret key` (`sk_test_...`)
   - `Publishable key` (`pk_test_...`)

Luu y: Stripe sandbox va Stripe test mode deu dung key prefix `*_test_*`.

## 2) Tao Product va Price trong sandbox

Tao 3 product:
- Basic
- Pro
- Max

Moi product tao recurring price:
- Monthly (bat buoc)
- Yearly (khuyen nghi)

Copy cac `price_...` ID:
- `STRIPE_PRICE_BASIC_MONTHLY`
- `STRIPE_PRICE_BASIC_YEARLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`
- `STRIPE_PRICE_MAX_MONTHLY`
- `STRIPE_PRICE_MAX_YEARLY`

## 3) Cau hinh env server

Cap nhat vao `apps/server/.env` theo mau `apps/server/.env.example`.

Bat buoc:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BASIC_MONTHLY`
- `STRIPE_PRICE_BASIC_YEARLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`
- `STRIPE_PRICE_MAX_MONTHLY`
- `STRIPE_PRICE_MAX_YEARLY`

## 4) Cau hinh webhook cho sandbox

Webhook endpoint cua server:
- `http://localhost:3000/api/auth/stripe/webhook`

Co 2 cach:

1. Dashboard webhook:
   - Tao endpoint trong sandbox dashboard.
   - Subscribe cac event subscription lien quan.
   - Copy signing secret `whsec_...` vao `STRIPE_WEBHOOK_SECRET`.
2. Stripe CLI (dev local):
   - Chay `stripe listen --forward-to http://localhost:3000/api/auth/stripe/webhook`
   - Copy `whsec_...` in ra terminal vao `STRIPE_WEBHOOK_SECRET`.

## 5) Kiem tra nhanh

```bash
bun run check-types
```

Neu thieu bien env bat buoc, `@NewsFlow/env/server` se bao loi som luc khoi dong.

## 6) Promotion code (voucher)

- NewsFlow cho phep nguoi dung nhap ma giam gia ngay tren man hinh Subscription (settings/personal).
- Sau khi bam `Apply`, app preview gia sau giam va tu dong ap ma khi tao Stripe Checkout.
- Nguoi dung nhap code text (vi du: `SUMMER26`, `GIAM20`), khong nhap `promo_...` ID.
- Trang thai active/expired, so lan su dung, va ty le giam duoc quan ly trong Stripe Dashboard.
