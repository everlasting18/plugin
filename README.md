# ContentAI

ContentAI là một hệ thống viết bài AI cho WordPress, gồm:

- backend `api/` để generate, rewrite, meta, license và quota
- frontend `frontend/` để landing page, login, dashboard và phát hành plugin
- plugin WordPress `wp-content/plugins/contentai-plugin/` để chạy trong Gutenberg và calendar

## Trạng thái hiện tại

- V1:
  - free tier chạy thật
  - Pro đang là demo/manual license key
  - frontend Astro build `static`
  - plugin download là file tĩnh `frontend/public/plugin.zip`
- V2:
  - dự kiến tích hợp Stripe cho billing và auto entitlement

## Cấu trúc repo

```text
.
├── api/                                # Deno + Hono backend
├── docs/                               # Tài liệu kiến trúc và flow
├── frontend/                           # Astro static site
└── wp-content/plugins/contentai-plugin # Plugin WordPress
```

## Docs nên đọc trước

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
  Kiến trúc tổng thể hiện tại của hệ thống

- [docs/V1_OPERATION_FLOW.md](docs/V1_OPERATION_FLOW.md)
  Luồng hoạt động thực tế của V1 từ login đến generate

- [docs/V2_STRIPE_BILLING.md](docs/V2_STRIPE_BILLING.md)
  Thiết kế định hướng cho V2 với Stripe

- [CHANGELOG.md](CHANGELOG.md)
  Tóm tắt thay đổi của mốc `version-1`

## Mô hình dữ liệu hiện tại

PocketBase hiện nên có 4 collection chính:

- `users`
- `user_domains`
- `licenses`
- `usage`

Chi tiết field và lý do thiết kế nằm trong:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [api/pb_migrations](api/pb_migrations)

## Chạy local

### 1. Backend API

Yêu cầu:

- Deno
- env cho OpenRouter, Tavily, PocketBase nếu dùng mode production

Chạy:

```bash
cd api
deno task dev
```

Kiểm tra:

```bash
deno lint src
deno check src/main.ts
```

### 2. Frontend

Yêu cầu:

- Node `>= 22.12.0`

Chạy dev:

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
npm run build
```

Lưu ý:

- frontend hiện build `static`
- output cuối là HTML/CSS/JS tĩnh
- không còn route server Astro cho download plugin

### 3. WordPress plugin

Plugin nằm tại:

- `wp-content/plugins/contentai-plugin`

Build asset:

```bash
cd wp-content/plugins/contentai-plugin
npm install
npm run build
```

## Env quan trọng

### API

Các biến thường dùng:

- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_MODEL`
- `OPENROUTER_MODEL_FALLBACK`
- `TAVILY_API_KEY`
- `PB_URL`
- `PB_ADMIN_TOKEN`
- `LOGS_ADMIN_TOKEN`

### Frontend

- `PUBLIC_PB_URL`
- `PUBLIC_API_URL`

## Flow V1 rất ngắn

### Free

```text
User login
-> thêm website ở dashboard
-> plugin gửi x-site-url
-> backend check usage theo domain + month
-> generate xong mới cộng usage
```

### Pro demo

```text
User login
-> thêm website + license key
-> frontend gọi /api/license/verify
-> backend bind key với site
-> plugin gửi x-site-url + x-license-key
-> backend verify entitlement rồi cho generate
```

## Source of truth

- user auth: PocketBase `users`
- domain ownership: PocketBase `user_domains`
- license validity: backend API qua `licenses`
- free quota: backend API qua `usage`
- generated content: backend orchestrator

`user_domains.tier` chỉ là dữ liệu tiện cho UI, không phải entitlement thật cuối cùng.

## Ghi chú triển khai

- backend mới là nơi quyết định Free/Pro và quota
- frontend và plugin chỉ là client
- plugin download hiện không cần login
- frontend đã chuyển từ SSR sang static

## Nhánh release

Nhánh V1 hiện tại:

- `version-1`
