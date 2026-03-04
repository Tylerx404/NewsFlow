# Stripe Setup (Test Mode)

Tai lieu nay dung de setup nhanh goi tra phi Stripe cho NewsFlow.

## 1) Tao tai khoan va bat Test Mode

1. Dang nhap Stripe Dashboard.
2. Chuyen sang **Test mode** (goc phai tren).
3. Vao `Developers > API keys` va copy:
   - `Secret key` (`sk_test_...`)
4. Vao `Developers > Webhooks`:
   - Tao endpoint webhook (vi du: `http://localhost:3000/api/auth/stripe/webhook`)
   - Subscribe it nhat cac event subscription can dung
   - Copy `Signing secret` (`whsec_...`)

## 2) Tao Product va Price

Tao 3 product:
- Basic
- Pro
- Max

Moi product tao recurring price theo nhu cau:
- Monthly (bat buoc)
- Yearly (tuy chon)

Sau khi tao, copy cac `price_...` ID:
- `STRIPE_PRICE_BASIC_MONTHLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_MAX_MONTHLY`
- `STRIPE_PRICE_BASIC_YEARLY` (optional)
- `STRIPE_PRICE_PRO_YEARLY` (optional)
- `STRIPE_PRICE_MAX_YEARLY` (optional)

## 3) Dien env server

Cap nhat vao `apps/server/.env` theo mau trong `apps/server/.env.example`.

Bat buoc:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- 3 monthly price IDs

Tuy chon:
- 3 yearly price IDs

## 4) Kiem tra nhanh

Chay:

```bash
bun run check-types
```

Neu thieu bien env bat buoc, `@NewsFlow/env/server` se bao loi som luc khoi dong.
