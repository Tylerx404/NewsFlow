# Stripe Setup (Admin System Ops)

Tai lieu nay mo ta cach cau hinh Stripe cho NewsFlow tu admin UI.

## 1) Tao key va price trong Stripe

1. Dang nhap Stripe Dashboard.
2. Chon dung environment sandbox/test.
3. Vao `Developers > API keys` va copy:
   - `Publishable key` (`pk_test_...`)
   - `Secret key` (`sk_test_...`)
4. Tao webhook secret `whsec_...` cho endpoint:
   - `http://localhost:3000/api/auth/stripe/webhook`
5. Tao 3 product va recurring price:
   - Basic: monthly + yearly
   - Pro: monthly + yearly
   - Max: monthly + yearly

## 2) Vao admin system ops de save config

Dang nhap bang tai khoan `ADMIN`, mo:

- `http://localhost:3001/admin/system-ops`

Tai card `Stripe config`, nhap:

- `Publishable key`
- `Secret key`
- `Webhook secret`
- `Basic monthly price`
- `Basic yearly price`
- `Pro monthly price`
- `Pro yearly price`
- `Max monthly price`
- `Max yearly price`

Sau do bam `Save Stripe config`.

## 3) Env khong con chua STRIPE_*

NewsFlow khong doc `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, hay `STRIPE_PRICE_*` tu `apps/server/.env` nua.

Chi con cac env he thong nhu:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `AI_KEY_ENCRYPTION_SECRET`
- `REDIS_URL`

## 4) Kiem tra nhanh

1. Mo `http://localhost:3001/admin/system-ops`
2. Xac nhan `Stripe config` hien `Configured`
3. Dang nhap user thuong va mo `http://localhost:3001/settings/personal`
4. Thu tao checkout session hoac mo billing portal

## 5) Promotion code (voucher)

- Voucher code van duoc nhap o man hinh subscription trong `settings/personal`
- App se preview gia qua Stripe va ap vao checkout neu code hop le
- Nguoi dung nhap text code (vi du `SUMMER26`), khong nhap `promo_...`
