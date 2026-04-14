# ContentAI Architecture

## Mục tiêu tài liệu

Tài liệu này mô tả kiến trúc hiện tại của project ở mốc V1.
Nó phản ánh code đang có trong repo, không phản ánh các flow cũ đã bị xóa như admin React cũ trong plugin hay frontend Astro SSR.

## Tổng quan hệ thống

Repository này thực chất là một WordPress install, bên trong có 3 khối chính:

- `api/`
  Backend Deno + Hono cho AI generation, license, quota, logs và integration với OpenRouter/Tavily/PocketBase.

- `frontend/`
  Site Astro tĩnh cho landing page, login, dashboard và phát hành file plugin zip.

- `wp-content/plugins/contentai-plugin/`
  Plugin WordPress chạy trong wp-admin, Gutenberg và calendar.

### Tư duy kiến trúc

Hệ thống được chia rõ thành 4 lớp trách nhiệm:

- Account layer
  Người dùng đăng nhập bằng PocketBase.

- Ownership layer
  User nào sở hữu website nào được lưu ở `user_domains`.

- Entitlement layer
  License key hợp lệ hay không, site nào được gắn Pro, hạn dùng đến đâu được quyết định ở backend API qua `licenses`.

- Usage layer
  Free quota theo website, theo tháng được lưu ở `usage`.

## System map

### 1. API backend

Location: `api/src`

Vai trò:

- expose `/api/generate`, `/api/rewrite`, `/api/meta`
- expose `/api/license/*`
- enforce auth, site binding và quota
- chạy pipeline AI: research -> writer -> editor
- gọi OpenRouter cho LLM
- gọi Tavily cho web research
- đọc/ghi license và usage qua PocketBase hoặc JSON fallback

Entry points:

- `api/src/main.ts`
- `api/src/routes/mod.ts`

### 2. Frontend Astro

Location: `frontend/src`

Vai trò:

- landing page công khai
- login bằng PocketBase client SDK
- dashboard quản lý domain và license
- phát file `plugin.zip` trực tiếp từ static site

Lưu ý quan trọng:

- frontend hiện là `static`, không còn SSR
- không còn route server `/api/download`
- nút download trỏ trực tiếp tới `frontend/public/plugin.zip`

Entry points:

- `frontend/src/pages/index.astro`
- `frontend/src/pages/login.astro`
- `frontend/src/pages/dashboard.astro`
- `frontend/src/pages/auth/callback.astro`

### 3. WordPress plugin

Location: `wp-content/plugins/contentai-plugin`

Vai trò:

- inject panel vào Gutenberg
- gọi API backend để generate/rewrite/meta
- làm lịch bài viết và schedule post
- nối dữ liệu WordPress với backend ContentAI

Entry point:

- `wp-content/plugins/contentai-plugin/contentai.php`

JS apps chính:

- `src/editor/`
- `src/calendar/`
- `src/lib/api.js`
- `src/lib/blocks.js`

## Storage model

### PocketBase collections

PocketBase hiện nên có 4 collection chính:

#### `users`

- auth collection mặc định của PocketBase
- dùng cho login dashboard/frontend

#### `user_domains`

Vai trò:

- user nào sở hữu website nào
- website nào đang active trên dashboard
- website nào đang gắn license key nào

Field chính:

- `user` relation -> `users`
- `domain`
- `tier`
- `license_key`
- `is_active`

#### `licenses`

Vai trò:

- nguồn entitlement thật cho Pro
- backend verify license theo `key + site_url`

Field chính:

- `key`
- `tier`
- `status`
- `site_url`
- `expires`
- `activated_at`

#### `usage`

Vai trò:

- quota free theo website và theo tháng

Field chính:

- `domain_id`
- `month`
- `count`

### Vì sao `usage.month` là text

- `month` là key của kỳ quota, không phải thời điểm cụ thể
- ví dụ: `2026_04`
- lookup đơn giản hơn timestamp range
- unique index `(domain_id, month)` dễ hiểu và dễ debug

### Vì sao `licenses.expires` là number

- `expires` và `activated_at` là mốc thời gian cụ thể
- backend so trực tiếp với `Date.now()`
- không phải bucket thời gian như `month`

## Runtime boundaries

### Boundary A: Frontend -> PocketBase

Frontend dùng PocketBase client SDK để:

- đăng nhập Google
- giữ auth store ở browser
- đọc/ghi `user_domains`

Frontend không phải source of truth cho entitlement.
Nó chỉ giữ ownership và UI state.

### Boundary B: Frontend -> API backend

Frontend gọi API backend cho:

- `POST /api/license/verify`
- `POST /api/license/check`
- `POST /api/license/usage`
- `POST /api/license/status`

Backend mới là nơi quyết định:

- site này đang Free hay Pro thật
- license key có hợp lệ không
- quota còn bao nhiêu

### Boundary C: Plugin -> API backend

Đây là flow production chính.

Plugin gọi backend với:

- `x-site-url`
- `x-license-key` nếu có

Backend xác thực request trước khi cho generate.

### Boundary D: Plugin -> WordPress

Plugin vẫn dùng dữ liệu native của WordPress cho:

- posts
- categories
- scheduled posts
- admin pages

## Backend architecture

Backend hiện theo hướng:

- `routes`
- `middleware`
- `usecases`
- `services`
- `agents`
- `storage`

### Route layer

Location: `api/src/routes`

Nhiệm vụ:

- parse request
- gọi usecase
- trả response

### Middleware layer

Location: `api/src/lib/licenseMiddleware.ts`

Nhiệm vụ:

- đọc `x-license-key`
- đọc `x-site-url`
- verify auth/quota trước các route content

### Usecase layer

Location: `api/src/usecases`

Nhiệm vụ:

- validate business input
- gọi service hoặc orchestration phù hợp

Usecase hiện có:

- `generate.ts`
- `rewrite.ts`
- `meta.ts`
- `license.ts`

### Service layer

Các file chính:

- `api/src/lib/licenseService.ts`
- `api/src/services/openrouter.ts`
- `api/src/tools/search.ts`

Nhiệm vụ:

- xử lý business logic dùng chung
- gọi external providers
- làm cache và normalization

### Storage layer

Location:

- `api/src/lib/licenseStorage.ts`

Nhiệm vụ:

- đọc/ghi PocketBase
- fallback về JSON khi thiếu env

### Agent layer

Location:

- `api/src/agents`

Nhiệm vụ:

- implement pipeline AI

Các module chính:

- `frameworkStrategy.ts`
- `research.ts`
- `writer.ts`
- `editorGate.ts`
- `editor.ts`
- `orchestrator.ts`

## Frontend architecture

Frontend hiện là Astro static + client-side PocketBase.

### Pages

- `index.astro`
  landing page

- `login.astro`
  login bằng Google OAuth qua PocketBase SDK

- `dashboard.astro`
  UI quản lý domain, status, quota và plugin download

- `auth/callback.astro`
  callback page sau OAuth

### Shared frontend libs

- `src/lib/runtime.ts`
  gom runtime config như `PUBLIC_PB_URL`, `PUBLIC_API_URL`

- `src/lib/pocketbase.ts`
  helper tạo PocketBase client và sync auth cookie

- `src/lib/dashboard.ts`
  logic dashboard: load domains, fetch status, add/delete domain, render usage

### Static output

Frontend đang build `static`, nên output cuối sẽ là:

- HTML tĩnh
- CSS/JS assets
- file `plugin.zip`

Không còn Node server Astro để chạy runtime route.

## Plugin architecture

### PHP layer

File chính: `contentai.php`

Nhiệm vụ:

- đăng ký menu admin
- enqueue asset
- inject config vào JS
- expose REST/AJAX route nội bộ cho WordPress

### Editor app

Location: `src/editor`

Nhiệm vụ:

- panel generate trong Gutenberg
- floating toolbar rewrite
- insert block vào editor

### Calendar app

Location: `src/calendar`

Nhiệm vụ:

- content calendar
- schedule post
- timezone handling cho publish time

### API bridge

Location: `src/lib/api.js`

Nhiệm vụ:

- gọi backend Deno API
- stream generate result
- gọi rewrite/meta

## Source of truth

### Source of truth thực tế

- user auth: PocketBase `users`
- domain ownership: PocketBase `user_domains`
- license validity: backend API qua `licenses`
- free quota: backend API qua `usage`
- generated content: backend orchestrator output

### Chỗ chỉ là mirror/UI convenience

- `user_domains.tier`
  không phải nguồn entitlement cuối cùng

- quota snapshot được inject vào plugin
  chỉ để hiển thị nhanh, backend vẫn là nguồn quyết định cuối

## Build and deploy model

### API

- chạy bằng Deno
- có thể deploy riêng
- dùng env thật cho OpenRouter, Tavily, PocketBase

### Frontend

- build static bằng Astro
- chỉ cần host file tĩnh

### Plugin

- build asset bằng Vite
- zip plugin để phát hành

## V1 product model

### Free

- user login
- thêm website
- không cần license key
- plugin gửi `x-site-url`
- backend check quota theo `usage`

### Pro demo

- user thêm website + nhập license key
- frontend gọi `/api/license/verify`
- backend bind key với website
- plugin gửi `x-site-url + x-license-key`
- backend verify entitlement và bỏ qua quota free

## V2 direction

V2 không đổi kiến trúc lõi.
Nó chỉ thêm billing layer qua Stripe.

Giữ nguyên:

- plugin vẫn là client
- backend vẫn là entitlement source
- `licenses` vẫn là lớp quyết định Pro

Xem thêm:

- `docs/V2_STRIPE_BILLING.md`
