# License Key System — Architecture

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    WORDPRESS PLUGIN                          │
│                 (contentai.php + React)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴──────────────────┐
         ▼                                    ▼
┌──────────────────────┐          ┌──────────────────────────┐
│  Settings Page       │          │  Gutenberg Sidebar       │
│  (Admin Page)        │          │  (LeftPanel.jsx)         │
│                      │          │                          │
│  ┌────────────────┐  │          │  ┌──────────────────┐   │
│  │ Nhập License  │  │          │  │ Keyword Input    │   │
│  │ Key           │  │          │  └────────┬─────────┘   │
│  └───────┬────────┘  │          │           │              │
│          │ POST       │          │           ▼ api.js      │
│          │ /license/  │          │  ┌──────────────────┐   │
│          │ verify     │          │  │ generateStream() │   │
│          ▼            │          │  └────────┬─────────┘   │
│  ┌────────────────┐  │          │           │              │
│  │ ✓ Pro → Lưu    │  │          │  x-license-key  x-site-url │
│  │ ✗ Free → Error │  │          └───────┬───────────────┘   │
│  └───────┬────────┘  │                  │                   │
└──────────┼───────────┘                  ▼                   │
           │                   ┌──────────────────┐          │
           │                   │ window.contentaiData│         │
           │                   │ • licenseKey      │          │
           │                   │ • siteUrl         │          │
           │                   │ • licenseTier     │          │
           │                   │ • isPro           │          │
           │                   └──────────────────┘          │
           │                              │
           ▼                              ▼
┌────────────────────────────────────────────────────────────────┐
│                    API BACKEND (Deno/Hono)                      │
│                  http://localhost:3000/api                      │
└────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────────────┐
                    │  POST /api/license/verify             │
                    │  (không qua middleware)               │
                    │                                      │
                    │  activates key, binds to site_url,      │
                    │  saves to licenses.json               │
                    └──────────────────────────────────────┘

                    ┌──────────────────────────────────────┐
                    │  POST /api/generate                    │
                    │  POST /api/rewrite                     │
                    │  POST /api/meta                        │
                    │                                      │
                    │  ┌──────────────────────────────────┐ │
                    │  │  LICENSE MIDDLEWARE               │ │
                    │  │                                  │ │
                    │  │  1. Có x-license-key?             │ │
                    │  │     → verifyLicense() → allow ✓   │ │
                    │  │                                  │ │
                    │  │  2. Có x-site-url (free tier)?    │ │
                    │  │     → checkUsage() < 5/month      │ │
                    │  │        → incrementUsage() → allow │ │
                    │  │        → 429 "hết quota"          │ │
                    │  │                                  │ │
                    │  │  3. Không có gì?                   │ │
                    │  │     → 401 "cần license key"      │ │
                    │  └──────────────────────────────────┘ │
                    └──────────────────────────────────────┘

                    ┌──────────────────────────────────────┐
                    │  Data Storage (JSON files)            │
                    │                                      │
                    │  licenses.json                       │
                    │  ┌──────────────────────────────┐    │
                    │  │ "DEMO-PRO-TEST": {            │    │
                    │  │   key: "DEMO-PRO-TEST",       │    │
                    │  │   tier: "pro",                │    │
                    │  │   siteUrl: "http://test.local"│    │
                    │  │   expires: 1807248022466,      │    │
                    │  │   activated: 1744191234567    │    │
                    │  │ }                              │    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  usage.json                          │
                    │  ┌──────────────────────────────┐    │
                    │  │ [                             │    │
                    │  │   { siteUrl, month, count,    │    │
                    │  │     updatedAt },              │    │
                    │  │ ]                             │    │
                    │  └──────────────────────────────┘    │
                    └──────────────────────────────────────┘
```

## Tier System

```
┌──────────────────────────────────────────────────────────────┐
│  FREE TIER                                                │
│  • 5 bài viết / tháng (per site_url)                      │
│  • Kiểm soát bởi usage.json trên API server               │
│  • Khi hết quota → 429 "Bạn đã dùng hết 5 bài miễn phí"  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PRO TIER                                                  │
│  • Unlimited bài viết                                      │
│  • License key được activate trên API server               │
│  • Expires check (null = never)                           │
│  • Site URL binding check                                  │
└──────────────────────────────────────────────────────────────┘
```

## Usage Flow (Step by Step)

```
1. USER nhập License Key trong Settings Page
   └→ WordPress POST /api/license/verify
   └→ API activateLicense() → lưu vào licenses.json
   └→ WordPress lưu vào wp_options:
       - contentai_license_key
       - contentai_license_tier
       - contentai_license_status = "active"
       - contentai_license_expires
       - contentai_license_last_check

2. USER viết bài trong Gutenberg Editor
   └→ React gọi api.generateStream(body)
   └→ api.js gửi kèm headers:
       x-license-key: DEMO-PRO-TEST  (hoặc empty)
       x-site-url: http://mysite.com (từ home_url)
   └→ API nhận request

3. LICENSE MIDDLEWARE xử lý
   └→ Có license key?
       ✓ → verifyLicense(key, site_url) → Cache 5min
           • Key hợp lệ + Pro → allow
           • Key hết hạn → 403
           • Key không match site → 403
           • Key không tồn tại → 403
       ✗ → Có site_url?
           ✓ → checkUsage(site_url) đọc usage.json
               • count < 5 → allow + incrementUsage()
               • count >= 5 → 429 "hết quota"
           ✗ → 401 "cần license key hoặc site URL"

4. AGENTS xử lý (nếu allowed)
   └→ runResearchAgent() → web search
   └→ runWriterAgent() → generate content
   └→ runRevisionLoop() → editorial review
   └→ stream về React

5. React hiển thị kết quả
   └→ insert vào Gutenberg
```
