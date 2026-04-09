# PocketBase Integration Flow

## Tổng quan — Dual Mode

```
┌─────────────────────────────────────────────────────────────┐
│  API Server startup                                        │
│                                                             │
│  1. Đọc .env                                              │
│  2. Có PB_URL + PB_ADMIN_TOKEN?                          │
│     ├─ CÓ  → USE_PB = true  → dùng PocketBase            │
│     └─ KHÔNG → USE_PB = false → fallback JSON files      │
│                                                             │
│  3. Tất cả functions check USE_PB trước khi chạy          │
└─────────────────────────────────────────────────────────────┘
```

---

## Chi tiết từng function

### 1. activateLicense(key, siteUrl)

```
activateLicense("DEMO-PRO-TEST", "http://site.com")
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  USE_PB = true?                                           │
│                                                             │
│  ├─ YES → PocketBase flow:                                │
│  │     ├─ pbGetLicense("DEMO-PRO-TEST")                   │
│  │     │      GET /api/collections/licenses/records         │
│  │     │      filter: key="DEMO-PRO-TEST"                 │
│  │     │      → tìm record trong PB                       │
│  │     │                                                 │
│  │     ├─ Tìm thấy?                                       │
│  │     │   → PATCH/licenses/records/:id                   │
│  │     │      { siteUrl, expires, updated }               │
│  │     │   → return { valid: true, tier, expires }      │
│  │     │                                                 │
│  │     ├─ Không tìm thấy + là DEMO key?                   │
│  │     │   → POST /licenses/records                       │
│  │     │      { key, tier: "pro", siteUrl, status, ... }  │
│  │     │   → return { valid: true, tier: "pro" }         │
│  │     │                                                 │
│  │     └─ Không tìm thấy + không phải DEMO?               │
│  │         → return { valid: false, message }            │
│  │                                                       │
│  └─ NO → JSON flow (dev mode):                           │
│        ├─ Đọc licenses.json                             │
│        ├─ Tìm key trong object                           │
│        └─ Update/write file                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. verifyLicense(key, siteUrl)

```
verifyLicense("DEMO-PRO-TEST", "http://site.com")
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Check in-memory cache (5 phút)                        │
│     ├─ Cache hit → return ngay                             │
│     └─ Cache miss → continue                              │
│                                                             │
│  2. USE_PB = true?                                         │
│     ├─ YES → PocketBase:                                  │
│     │     ├─ pbGetLicense(key)                           │
│     │     │      GET /api/collections/licenses/records     │
│     │     │      filter: key="DEMO-PRO-TEST"             │
│     │     │      → 1 record hoặc null                    │
│     │     │                                               │
│     │     ├─ Key không tồn tại → return invalid          │
│     │     │                                               │
│     │     ├─ Expires < now? → return expired             │
│     │     │                                               │
│     │     ├─ siteUrl không match? → return invalid site  │
│     │     │                                               │
│     │     └─ OK → return { valid: true, tier, expires }  │
│     │                                                       │
│     └─ NO → JSON flow:                                    │
│           ├─ Đọc licenses.json                            │
│           ├─ Tìm record                                   │
│           └─ Same checks (expired, site match)          │
│                                                             │
│  3. Lưu result vào cache (5 phút)                         │
└─────────────────────────────────────────────────────────────┘
```

### 3. checkUsage(siteUrl) + incrementUsage(siteUrl)

```
checkUsage("http://site.com")
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  month = "2026_04"  (format: YYYY_MM)                     │
│                                                             │
│  USE_PB = true?                                           │
│  ├─ YES → PocketBase:                                    │
│  │     ├─ GET /api/collections/usage/records            │
│  │     │    filter: site_url="http://site.com"           │
│  │     │         && month="2026_04"                     │
│  │     │                                                 │
│  │     ├─ Tìm thấy → lấy count                           │
│  │     │   → count < 5 → allowed: true                  │
│  │     │   → count >= 5 → allowed: false (429)         │
│  │     │                                                 │
│  │     └─ Không tìm thấy → count = 0 → allowed          │
│  │                                                       │
│  └─ NO → JSON flow:                                       │
│        ├─ Đọc usage.json                                 │
│        ├─ Tìm record (site_url + month)                 │
│        └─ Same logic                                    │
└─────────────────────────────────────────────────────────────┘

incrementUsage("http://site.com")
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  USE_PB = true?                                           │
│  ├─ YES → PocketBase:                                    │
│  │     ├─ Tìm usage record (site_url + month)            │
│  │     ├─ Tìm thấy → PATCH count + 1                    │
│  │     └─ Không tìm thấy → POST { siteUrl, month, 1 }  │
│  │                                                       │
│  └─ NO → JSON flow:                                      │
│        ├─ Tìm + increment hoặc push record mới            │
│        └─ Ghi usage.json                                │
└─────────────────────────────────────────────────────────────┘
```

### 4. Middleware flow

```
Request đến /api/generate
  Headers:
    x-license-key: DEMO-PRO-XXXX
    x-site-url: http://site.com
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  LICENSE MIDDLEWARE (chạy trước handler)                  │
│                                                             │
│  1. Có x-license-key?                                      │
│     ├─ CÓ:                                                │
│     │     → verifyLicense(key, siteUrl)                  │
│     │        └─ PB: GET /licenses/records?filter=...     │
│     │        └─ Cache 5 phút                            │
│     │        ├─ Valid + Pro → c.set("license", {...})   │
│     │        │                    → await next()         │
│     │        └─ Invalid → 403 + return                  │
│     │                                                       │
│     └─ KHÔNG:                                             │
│           → Có x-site-url?                                │
│             ├─ CÓ:                                       │
│             │    → checkUsage(siteUrl)                  │
│             │       └─ PB: GET /usage/records?filter=... │
│             │       ├─ allowed → c.set("license", {...})│
│             │       │             → await next()        │
│             │       │             → incrementUsage()     │
│             │       │               └─ PB: PATCH or POST │
│             │       └─ not allowed → 429 + return        │
│             │                                             │
│             └─ KHÔNG:                                     │
│                  → 401 "cần license key"                  │
└─────────────────────────────────────────────────────────────┘
```

---

## PB API calls cụ thể

```
┌──────────────────────────────────────────────────────────────┐
│  LICENSES collection                                        │
│                                                              │
│  CREATE  POST /api/collections/licenses/records             │
│    { key, tier, site_url, expires, status, activated_at } │
│                                                              │
│  READ    GET /api/collections/licenses/records                │
│    ?filter=key="DEMO-PRO-TEST"&limit=1                      │
│                                                              │
│  UPDATE  PATCH /api/collections/licenses/records/:id        │
│    { site_url, expires, activated_at, updated }            │
│                                                              │
│  INDEX   unique(key) → tạo trong PocketBase dashboard     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  USAGE collection                                           │
│                                                              │
│  READ    GET /api/collections/usage/records               │
│    ?filter=site_url="..." && month="2026_04"&limit=1       │
│                                                              │
│  UPDATE  PATCH /api/collections/usage/records/:id          │
│    { count: 3 }                                           │
│                                                              │
│  CREATE  POST /api/collections/usage/records             │
│    { site_url, month, count: 1 }                           │
│                                                              │
│  INDEX   unique(site_url + month)                          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  USAGE_LOGS collection (audit, optional)                     │
│                                                              │
│  CREATE  POST /api/collections/usage_logs/records        │
│    { license, site_url, action, keyword, status,          │
│      tokens, duration_ms, created }                        │
│                                                              │
│  LIST    GET /api/collections/usage_logs/records           │
│    ?filter=created<{90days_ago}&perPage=500               │
│                                                              │
│  DELETE  (batch cleanup)                                    │
│    DELETE /api/collections/usage_logs/records/:id           │
└──────────────────────────────────────────────────────────────┘
```

---

## Auth flow với PocketBase Admin API

```
1. Authenticate (1 lần khi server start hoặc khi token hết hạn):
   POST /api/admins/auth-with-password
   body: { identity: email, password: password }
   → nhận { token: "xxx" }

2. Dùng token cho tất cả calls:
   Authorization: Admin {token}
   (thay vì Bearer token dùng cho user auth)
```

---

## Tóm tắt — Dual Mode

```
                    DEV MODE                  PRODUCTION MODE
                  (không có PB)              (có PB env)
                 ───────────────             ─────────────────

activateLicense    licenses.json         →   PocketBase
verifyLicense      licenses.json + cache →   PocketBase + cache
checkUsage         usage.json            →   PocketBase
incrementUsage     usage.json            →   PocketBase

→ Tất cả functions tự detect và chọn storage phù hợp
→ Không cần thay đổi code khi deploy
→ Chỉ cần thêm PB credentials vào .env
```
