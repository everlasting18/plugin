# ContentAI — Hệ thống License Key

## Tổng quan

ContentAI sử dụng mô hình **SaaS License** với 2 tier:

| Tier | Giới hạn | Giá |
|------|-----------|-----|
| **Free** | 5 bài/tháng/site | Miễn phí |
| **Pro** | Unlimited | Trả phí |

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S WORDPRESS                             │
│                                                                      │
│  ┌──────────────┐   ┌───────────────────┐   ┌──────────────────┐    │
│  │ Settings Page │   │ Gutenberg Editor  │   │   Dashboard     │    │
│  │ Nhập License │   │ LeftPanel + API   │   │ Hiển thị Tier   │    │
│  └──────┬───────┘   └─────────┬─────────┘   └───────┬──────────┘    │
│         │                     │                     │                │
│         ▼                     ▼                     ▼                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              window.contentaiData                             │  │
│  │  licenseKey: "DEMO-PRO-XXXX"                                  │  │
│  │  licenseTier: "pro"                                             │  │
│  │  isPro: true                                                   │  │
│  │  siteUrl: "http://localhost/wordpress"                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐      ┌──────────────────────────────┐
│   API Backend (Deno)     │      │   PocketBase Cloud         │
│                          │      │   (Production)              │
│  ┌────────────────────┐  │      │                              │
│  │ License Middleware │  │      │  ┌─────────────────────┐    │
│  │ verify / check     │  │      │  │  licenses           │    │
│  │ (5 min cache)      │  │      │  │  usage              │    │
│  └────────┬───────────┘  │      │  │  usage_logs         │    │
│           │              │      │  └─────────────────────┘    │
│           ▼              │      └──────────────────────────────┘
│  ┌────────────────────┐  │      ┌──────────────────────────────┐
│  │ Agents Pipeline    │  │      │   JSON Files (Dev)           │
│  │ Research→Writer→   │  │      │   licenses.json              │
│  │ Editor             │  │      │   usage.json                  │
│  └────────────────────┘  │      └──────────────────────────────┘
└──────────────────────────┘
```

---

## Data Flow chi tiết

### Flow 1: Kích hoạt License Key (Settings Page)

```
User nhập "DEMO-PRO-XXXX" vào Settings
         │
         ▼
WordPress POST /api/license/verify
Body: { key: "DEMO-PRO-XXXX", site_url: "http://localhost/wordpress" }
         │
         ▼
┌─────────────────────────────────────────────┐
│  LICENSE MIDDLEWARE — KHÔNG chạy           │
│  (route /license không có middleware)        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  activateLicense(key, site_url)            │
│                                             │
│  USE_PB = true?                             │
│  ├─ YES → PB: pbSaveLicense()              │
│  │     POST /api/collections/licenses/records│
│  │     → Lưu key, tier, site_url, status   │
│  │                                             │
│  └─ NO  → JSON: Ghi licenses.json           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  WordPress lưu vào wp_options:            │
│  contentai_license_key = "DEMO-PRO-XXXX"  │
│  contentai_license_tier = "pro"            │
│  contentai_license_status = "active"        │
│  contentai_license_expires = 1807253404298 │
└─────────────────────────────────────────────┘
```

### Flow 2: Generate Content (Gutenberg)

```
User nhập keyword + click "Generate"
         │
         ▼
┌─────────────────────────────────────────────┐
│  api.generateStream({ keyword, ... })      │
│                                             │
│  Headers:                                  │
│    x-license-key: DEMO-PRO-XXXX             │
│    x-site-url: http://localhost/wordpress   │
└─────────────────┬─────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  LICENSE MIDDLEWARE (chạy TRƯỚC handler)  │
│                                             │
│  1. Có x-license-key? → CÓ                 │
│     verifyLicense("DEMO-PRO-XXXX")          │
│       ├─ USE_PB = true → GET /licenses     │
│       │   filter: key="DEMO-PRO-XXXX"      │
│       │   → { valid: true, tier: "pro" }   │
│       │   → Cache 5 phút                    │
│       │                                      │
│       ├─ valid + pro? → ALLOW               │
│       │   c.set("license", { isPro: true }) │
│       │   → next()                          │
│       │                                      │
│       └─ invalid? → 403 + return          │
│                                             │
│  2. KHÔNG check usage (Pro = unlimited)   │
└─────────────────┬─────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Agents Pipeline (Research→Writer→Editor)  │
│  Stream response về frontend               │
└─────────────────────────────────────────────┘
```

### Flow 3: Free Tier (không có license key)

```
User không nhập license key, chỉ gửi x-site-url
         │
         ▼
┌─────────────────────────────────────────────┐
│  LICENSE MIDDLEWARE                        │
│                                             │
│  1. Có x-license-key? → KHÔNG             │
│                                             │
│  2. Có x-site-url? → CÓ                   │
│     checkUsage("http://site.com")           │
│       ├─ USE_PB → PB: GET /usage           │
│       │   filter: site_url + month         │
│       │                                      │
│       ├─ count < 5? → ALLOW                │
│       │   c.set("license", { isPro: false })│
│       │   → next()                          │
│       │   → incrementUsage() sau request   │
│       │                                      │
│       └─ count >= 5? → 429 "hết quota"    │
│                                             │
│  3. Không có gì? → 401 "cần license key"  │
└─────────────────────────────────────────────┘
```

---

## Dual Mode — Storage

### Development Mode (không có PB env)

```
USE_PB = false (không có PB_URL hoặc PB_ADMIN_TOKEN)
         │
         ▼
┌─────────────────────────────────────────────┐
│  JSON Files                                 │
│                                             │
│  licenses.json                              │
│  {                                          │
│    "DEMO-PRO-XXXX": {                       │
│      key: "DEMO-PRO-XXXX",                 │
│      tier: "pro",                          │
│      siteUrl: "http://localhost",           │
│      expires: 1937452800000,               │
│      activated: 1744176000000              │
│    }                                        │
│  }                                          │
│                                             │
│  usage.json                                 │
│  [                                          │
│    { siteUrl, month: "2026_04", count: 3 } │
│  ]                                          │
└─────────────────────────────────────────────┘
```

### Production Mode (có PB env)

```
USE_PB = true (có PB_URL + PB_ADMIN_TOKEN)
         │
         ▼
┌─────────────────────────────────────────────┐
│  PocketBase Cloud                           │
│  https://8qj9xau0f6ama5b.591p.pocketbasecloud.com │
│                                             │
│  Collections:                               │
│  ├─ licenses (key, tier, site_url, status)│
│  ├─ usage (site_url, month, count)         │
│  └─ usage_logs (audit, optional)            │
│                                             │
│  Auth: Bearer Token (API Token)           │
└─────────────────────────────────────────────┘
```

---

## Environment Variables

### API Backend (.env)

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-xxx
TAVILY_API_KEY=tvly-xxx

# Optional (default values)
PORT=3000
OPENROUTER_MODEL=google/gemini-2.5-flash-lite
OPENROUTER_MODEL_FALLBACK=google/gemini-2.5-flash-lite
FREE_LIMIT=5

# PocketBase (bật production mode)
PB_URL=https://8qj9xau0f6ama5b.591p.pocketbasecloud.com
PB_ADMIN_TOKEN=eyJhbGciOiJIUzI1NiJ9...  # API Token từ Settings → API preview
```

---

## API Endpoints

### POST /api/license/verify — Kích hoạt license

**Input:**
```json
{
  "key": "DEMO-PRO-XXXX",
  "site_url": "http://localhost/wordpress"
}
```

**Output (thành công):**
```json
{
  "valid": true,
  "tier": "pro",
  "expires": 1807253404298,
  "message": "Demo activated!"
}
```

**Output (thất bại):**
```json
{
  "valid": false,
  "tier": "free",
  "expires": null,
  "message": "License key không hợp lệ."
}
```

### POST /api/license/check — Kiểm tra nhanh

**Input:**
```json
{ "key": "DEMO-PRO-XXXX" }
```

**Output:**
```json
{
  "valid": true,
  "tier": "pro",
  "expires": 1807253404298,
  "message": "OK"
}
```

### POST /api/generate, /api/rewrite, /api/meta

Yêu cầu headers:
```
x-license-key: <key>     // cho Pro tier
x-site-url: <url>        // cho Free tier
```

**Response codes:**
- `200` — Thành công
- `401` — Không có license key hoặc site URL
- `403` — License key không hợp lệ hoặc hết hạn
- `429` — Free tier đã dùng hết 5 bài/tháng

---

## PocketBase Collections

### licenses

| Field | Type | Mô tả |
|-------|------|--------|
| key | text | License key (unique) |
| tier | select | `free` hoặc `pro` |
| site_url | url | URL đã đăng ký |
| status | select | `active`, `revoked`, `expired` |
| expires | number | Timestamp hết hạn |
| activated_at | number | Timestamp kích hoạt |

### usage

| Field | Type | Mô tả |
|-------|------|--------|
| site_url | url | URL site (unique với month) |
| month | text | Tháng (format: YYYY_MM) |
| count | number | Số bài đã dùng |

### usage_logs (audit)

| Field | Type | Mô tả |
|-------|------|--------|
| license | text | License key |
| site_url | url | URL site |
| action | select | `generate`, `rewrite`, `meta` |
| keyword | text | Từ khóa |
| status | select | `success`, `error`, `rejected` |
| tokens | number | Số tokens |
| duration_ms | number | Thời gian (ms) |

---

## Cài đặt PocketBase

### 1. Import Collections

Vào **Settings → Import collections** trên PocketBase Dashboard, lần lượt import:

1. `pb_migrations/1_licenses.json`
2. `pb_migrations/2_usage.json`
3. `pb_migrations/3_usage_logs.json`

### 2. Lấy API Token

1. Vào **Settings → API preview**
2. Copy **API Token** (bắt đầu bằng `eyJ...`)

### 3. Thêm vào .env

```bash
PB_URL=https://8qj9xau0f6ama5b.591p.pocketbasecloud.com
PB_ADMIN_TOKEN=eyJhbGciOiJIUzI1NiJ9...
```

### 4. Tạo DEMO License

```bash
cd api
PB_TOKEN=eyJ... deno run --allow-net --allow-env pb_migrations/sync_to_pb.ts
```

### 5. Restart API

```bash
deno task dev
```

---

## Chạy API (Development)

```bash
# Chế độ dev (dùng JSON files, không cần PocketBase)
cd api
deno task dev

# Chế độ production (dùng PocketBase)
# Thêm PB_URL + PB_ADMIN_TOKEN vào .env trước
deno task dev
```

---

## Test

```bash
# 1. Verify license
curl -X POST http://localhost:3000/api/license/verify \
  -H "Content-Type: application/json" \
  -d '{"key":"DEMO-PRO-XXXX","site_url":"http://localhost"}'

# 2. Generate với Pro key
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "x-license-key: DEMO-PRO-XXXX" \
  -H "x-site-url: http://localhost" \
  -d '{"keyword":"test","tone":"professional","count":1}'

# 3. Generate Free (5 bài/tháng)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "x-site-url: http://freesite.com" \
  -d '{"keyword":"test","tone":"professional","count":1}'
```

---

## Files quan trọng

| File | Mô tả |
|------|--------|
| `src/lib/license.ts` | Core: middleware, verify, usage tracking |
| `src/routes/license.ts` | API endpoints: /verify, /check |
| `src/routes/mod.ts` | Route setup với middleware |
| `pb_migrations/*.json` | PocketBase collection schemas |
| `pb_migrations/sync_to_pb.ts` | Script tạo DEMO license |
| `pocketbase-types.ts` | TypeScript types cho PB |
| `docs/LICENSE_SYSTEM.md` | Documentation này |
