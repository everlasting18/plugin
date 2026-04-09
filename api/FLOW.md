# ContentAI — Complete Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  USER'S WORDPRESS SITE                                           │
│  WordPress + ContentAI Plugin + Gutenberg Editor               │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
┌───────────────────┐           ┌───────────────────────┐
│  Settings Page    │           │  Gutenberg Editor      │
│  (Admin Panel)    │           │  (LeftPanel + API)     │
│                   │           │                       │
│  1. Nhập License  │           │  1. User nhập keyword │
│  2. POST verify   │           │  2. Click Generate    │
│  3. Lưu options  │           │  3. API request        │
└────────┬──────────┘           └───────────┬───────────┘
         │                                 │
         ▼                                 ▼
    ┌─────────────────────────────────────────────┐
    │  window.contentaiData                       │
    │  {                                          │
    │    licenseKey: "DEMO-PRO-XXXX",             │
    │    siteUrl: "http://localhost/wordpress",   │
    │    isPro: true,                             │
    │    licenseTier: "pro"                      │
    │  }                                          │
    └─────────────────────────────────────────────┘
```

---

## Flow 1: Kích hoạt License Key

```
USER nhập key trong Settings Page
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  WordPress → POST /api/license/verify                    │
│                                                          │
│  Body: { key: "DEMO-PRO-XXXX", site_url: "..." }        │
└────────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│  LICENSE MIDDLEWARE (không có) → /license/verify route   │
└────────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│  activateLicense() → lưu vào LICENSES (PB hoặc JSON)   │
│                                                          │
│  PocketBase:                                             │
│    { key, tier, site_url, expires, status, activated } │
│                                                          │
│  JSON (dev):                                             │
│    { "DEMO-PRO-XXXX": { key, tier, site_url, ... } }    │
└────────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│  WordPress lưu vào wp_options:                           │
│    contentai_license_key = "DEMO-PRO-XXXX"             │
│    contentai_license_tier = "pro"                       │
│    contentai_license_status = "active"                   │
│    contentai_license_expires = 1807...                  │
└──────────────────────────────────────────────────────────┘
```

---

## Flow 2: Generate Content (Gutenberg)

```
USER nhập keyword + click "Generate"
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  React (LeftPanel.jsx)                                   │
│                                                          │
│  api.generateStream({ keyword, tone, count, ... })      │
│         │                                                │
│         │ headers:                                        │
│         │   x-license-key: window.contentaiData.licenseKey │
│         │   x-site-url: window.contentaiData.siteUrl    │
│         ▼                                                │
│  api.js                                                  │
│    fetch(API_URL + "/generate", {                         │
│      headers: {                                           │
│        'Content-Type': 'application/json',              │
│        'x-license-key': 'DEMO-PRO-XXXX',  ←── từ WP    │
│        'x-site-url': 'http://localhost/...' ←── từ WP   │
│      },                                                  │
│      body: { keyword, tone, ... }                        │
│    })                                                    │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  API SERVER (Deno/Hono) — http://localhost:3000/api      │
│                                                          │
│  Request:                                                │
│    POST /generate                                        │
│    x-license-key: DEMO-PRO-XXXX                         │
│    x-site-url: http://localhost/wordpress                 │
│    body: { keyword: "cách giảm cân", ... }               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  LICENSE MIDDLEWARE (chạy TRƯỚC handler)          │   │
│  │                                                   │   │
│  │  1. Kiểm tra x-license-key                        │   │
│  │     → verifyLicense() → Cache 5min               │   │
│  │     → Pro → ALLOW → next()                        │   │
│  │                                                     │   │
│  │  2. Hoặc: kiểm tra x-site-url (free tier)         │   │
│  │     → checkUsage() → count < 5 → ALLOW             │   │
│  │     → incrementUsage()                            │   │
│  │     → count >= 5 → 429 "hết quota"               │   │
│  │                                                     │   │
│  │  3. Không có gì → 401 "cần license key"           │   │
│  └──────────────────────────────────────────────────┘   │
│                       │                                  │
│                       ▼                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  AGENTS pipeline (Research → Writer → Editor)      │   │
│  │                                                   │   │
│  │  runResearchAgent()                               │   │
│  │    └→ Tavily web search (5 queries)               │   │
│  │    └→ AI phân tích → stats, trends, case studies  │   │
│  │                                                   │   │
│  │  runWriterAgent()                                 │   │
│  │    └→ AI viết content từ research + prompt         │   │
│  │    └→ HTML Gutenberg blocks                       │   │
│  │                                                   │   │
│  │  runRevisionLoop() (max 2 lần)                   │   │
│  │    └→ Editor review → scores                      │   │
│  │    └→ Nếu fail → Writer viết lại theo feedback     │   │
│  │    └→ Editor review lại                           │   │
│  └──────────────────────────────────────────────────┘   │
│                       │                                  │
│                       ▼                                  │
│  Stream response:                                         │
│    "[Research] Đang tìm kiếm...\n"                       │
│    "[Research] Tìm được 25 kết quả.\n"                   │
│    "[Post 1/1] [Writer] Đang viết content...\n"          │
│    "[DONE] {"posts": [{"content": "<html>", "title"}]} │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  React nhận stream, hiển thị progress + kết quả        │
│                                                          │
│  results.push({ id, content, title })                     │
│  <ResultCard> hiển thị preview                           │
│  "Insert" → editPost({ content, title })                 │
│          → Gutenberg blocks được tạo                    │
└──────────────────────────────────────────────────────────┘
```

---

## Flow 3: Free vs Pro — So sánh

```
┌─────────────────────────────────────────────────────────┐
│  FREE TIER (không có license key)                       │
│                                                         │
│  Client gửi:                                            │
│    x-site-url: http://site.com                         │
│    (không có x-license-key)                            │
│                                                         │
│  Middleware:                                            │
│    1. Có license key? → KHÔNG                          │
│    2. Có site_url? → CÓ                                 │
│    3. checkUsage(site_url)                              │
│       └→ đọc USAGE record                              │
│       └→ count < 5? → ALLOW                            │
│       └→ count >= 5? → 429 "hết quota"                │
│    4. incrementUsage() sau request                      │
│                                                         │
│  Mỗi site_url: 5 bài/tháng                             │
│  Reset mỗi tháng mới (month = "2026_04")                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  PRO TIER (có license key)                             │
│                                                         │
│  Client gửi:                                            │
│    x-license-key: DEMO-PRO-XXXX                        │
│    x-site-url: http://site.com                          │
│                                                         │
│  Middleware:                                            │
│    1. Có license key? → CÓ                             │
│    2. verifyLicense(key, site_url)                     │
│       └→ đọc LICENSES record (PB hoặc JSON)            │
│       └→ key tồn tại? → check expires                  │
│       └→ expires > now? → ALLOW                        │
│       └→ expired? → 403 "hết hạn"                       │
│       └→ site_url match? → ALLOW                        │
│    3. KHÔNG check usage                                 │
│    4. KHÔNG increment                                   │
│                                                         │
│  Unlimited bài/tháng                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Data Storage — 2 Chế độ

```
DEV MODE (không có PB env):
  ├── licenses.json  → { "DEMO-PRO-XXXX": { tier, siteUrl, expires } }
  └── usage.json     → [{ siteUrl, month, count }]

  ✅ Không cần PocketBase
  ✅ Tự động fallback

PRODUCTION (có PB env):
  ├── PB_URL=https://8qj9xau0f6ama5b.591p.pocketbasecloud.com
  └── PB_ADMIN_TOKEN=xxx

  ✅ LICENSES collection
  ✅ USAGE collection
  ✅ USAGE_LOGS collection (audit)
  ✅ CUSTOMERS collection (optional)
  ✅ Auto-cleanup logs > 90 ngày
```

---

## Cách chạy sync lên PocketBase

```bash
# 1. Thêm credentials vào .env
PB_URL=https://8qj9xau0f6ama5b.591p.pocketbasecloud.com
PB_ADMIN_EMAIL=trantanphat2002@gmail.com
PB_ADMIN_PASSWORD=5ji#Y!TUjoUq

# 2. Chạy sync script
cd api
deno run --allow-net --allow-env pb_migrations/sync_to_pb.ts

# 3. Output sẽ có admin token — copy vào .env
PB_URL=https://8qj9xau0f6ama5b.591p.pocketbasecloud.com
PB_ADMIN_TOKEN=<token-sau-sync>  ← paste token ở đây

# 4. Restart API server — giờ dùng PocketBase thay vì JSON
```

---

## Summary

| Bước | Ai làm | Gì |
|------|--------|-----|
| 1 | User | Nhập license key vào Settings Page |
| 2 | WordPress | POST /api/license/verify |
| 3 | API | activateLicense() → lưu vào PB/JSON |
| 4 | WordPress | Lưu vào wp_options |
| 5 | User | Viết bài trong Gutenberg |
| 6 | React | Gọi api.generateStream() kèm headers |
| 7 | API | Middleware verify key hoặc check usage |
| 8 | API | Agents pipeline (Research → Writer → Editor) |
| 9 | React | Stream + hiển thị kết quả |
| 10 | User | Insert vào Gutenberg |
