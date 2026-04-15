# Frontend Guide

Frontend của ContentAI là một app Astro dùng cho:

- landing page công khai
- login bằng PocketBase
- dashboard quản lý website và license
- phát hành file `plugin.zip`

Trạng thái hiện tại:

- Astro build `static`
- không còn SSR route cho download
- file plugin được phát trực tiếp từ `public/plugin.zip`

## 1. Vai trò của frontend trong hệ thống

Frontend **không phải** nơi quyết định quyền generate.

Frontend chỉ làm 3 việc chính:

1. đăng nhập user bằng PocketBase
2. quản lý ownership của website qua `user_domains`
3. gọi backend API để lấy status/quota/license thật

Source of truth:

- user auth: PocketBase
- website ownership: PocketBase `user_domains`
- license validity: backend API
- free quota: backend API

## 2. Cấu trúc thư mục

```text
frontend/
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   └── plugin.zip
├── src/
│   ├── components/
│   │   ├── Download.astro
│   │   ├── Features.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   └── Pricing.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   ├── dashboard.ts
│   │   ├── pocketbase.ts
│   │   └── runtime.ts
│   └── pages/
│       ├── auth/callback.astro
│       ├── dashboard.astro
│       ├── index.astro
│       └── login.astro
├── astro.config.mjs
└── package.json
```

## 3. Các page chính

### `src/pages/index.astro`

Landing page public.

Nhiệm vụ:

- giới thiệu sản phẩm
- dẫn user sang login hoặc download
- trình bày tính năng, pricing, download flow

### `src/pages/login.astro`

Trang login bằng Google OAuth qua PocketBase SDK.

Nhiệm vụ:

- khởi tạo PocketBase client
- gọi `authWithOAuth2({ provider: 'google' })`
- sync auth cookie
- redirect sang `/dashboard`

### `src/pages/auth/callback.astro`

Trang callback sau OAuth.

Nhiệm vụ:

- kết thúc flow auth của PocketBase
- giúp browser quay lại app chính

### `src/pages/dashboard.astro`

Dashboard quản lý website.

Nhiệm vụ:

- hiện user hiện tại
- load danh sách website từ `user_domains`
- thêm website mới
- gọi backend để lấy `license/status`
- hiển thị quota của website đang chọn
- cho tải plugin zip

## 4. Shared libs

### `src/lib/runtime.ts`

Gom runtime config:

- `PUBLIC_PB_URL`
- `PUBLIC_API_URL`

Mọi nơi cần gọi PocketBase hoặc API nên dùng file này thay vì hardcode URL.

### `src/lib/pocketbase.ts`

Helper PocketBase dùng chung:

- tạo PocketBase client
- sync auth store ra cookie

Mục đích:

- tránh lặp config và logic cookie giữa `Header`, `login`, `dashboard`

### `src/lib/dashboard.ts`

Toàn bộ logic client của dashboard hiện nằm ở đây.

Nó xử lý:

- load `user_domains`
- gọi `/api/license/status`
- render list website
- add domain
- delete domain
- update usage overview

Điểm quan trọng:

- `dashboard.astro` chỉ giữ markup + CSS
- logic không nên viết inline lại vào page nếu không thực sự cần

## 5. Header hoạt động như thế nào

`src/components/Header.astro` là component đặc biệt vì có:

- phần markup Astro
- phần script client-side
- phần CSS cho cả node render tĩnh và node render động

Header xử lý:

- link section của landing
- trạng thái login/logout
- badge `Free/Pro`
- mobile navigation

### Lưu ý quan trọng

Một số phần như avatar, email, badge, logout button được tạo bằng JavaScript sau khi page load.

Vì vậy style của `Header.astro` đang dùng:

- `<style is:global>`

Nếu đổi lại thành scoped CSS, các node render động sẽ bị vỡ layout.

## 6. Dashboard flow chi tiết

### Bước 1: check auth

Dashboard tạo PocketBase client và kiểm tra `pb.authStore.isValid`.

Nếu chưa login:

- UI chuyển sang trạng thái yêu cầu đăng nhập

### Bước 2: load `user_domains`

Dashboard query PocketBase:

- collection: `user_domains`
- filter: `user = currentUser.id`

Mục tiêu:

- biết user có những website nào
- website nào có `license_key`
- website nào đang `is_active`

### Bước 3: fetch status từ backend

Với mỗi domain, dashboard gọi:

- `POST ${PUBLIC_API_URL}/license/status`

Payload:

```json
{
  "domain": "https://example.com",
  "key": "DEMO-PRO-XXXX"
}
```

Backend trả:

- `tier`
- `isPro`
- `licenseValid`
- `expires`
- `message`
- `usage`

### Bước 4: render UI

Dashboard dùng cả 2 nguồn:

- `user_domains` cho ownership/UI
- `license/status` cho entitlement thật

Quy tắc:

- website có `isPro = true` thì hiện `Pro`
- website free thì hiện quota thật
- nếu API không sync được thì hiện degraded state thay vì đoán mò

### Bước 5: add website

Nếu user không nhập license key:

- tạo record `user_domains` dạng free

Nếu user nhập license key:

1. frontend gọi `/api/license/verify`
2. nếu valid mới tạo `user_domains`

## 7. Download plugin flow

Hiện tại frontend **không bắt login để download plugin**.

Nút download trỏ thẳng tới:

- `/plugin.zip`

File nằm tại:

- `frontend/public/plugin.zip`

Điều này cho phép frontend build static hoàn toàn.

### Hệ quả

- không còn route `src/pages/api/download/index.ts`
- không cần `output: 'server'`
- không cần host Node adapter để chỉ phục vụ file zip

## 8. Build mode

`astro.config.mjs` hiện dùng:

```js
export default defineConfig({
  output: 'static',
});
```

Điều đó có nghĩa:

- build ra HTML/CSS/JS tĩnh
- không có runtime Astro server
- deployment đơn giản hơn

## 9. Chạy local

### Cài dependency

```bash
cd frontend
npm install
```

### Dev server

```bash
npm run dev
```

### Build production

```bash
npm run build
```

### Preview build

```bash
npm run preview
```

## 10. Env cần có

Frontend dùng 2 biến chính:

```env
PUBLIC_PB_URL=https://your-pocketbase-url
PUBLIC_API_URL=http://localhost:3000/api
```

### `PUBLIC_PB_URL`

Dùng cho:

- login
- auth callback
- dashboard query `user_domains`
- header auth state

### `PUBLIC_API_URL`

Dùng cho:

- `/license/verify`
- `/license/check`
- `/license/usage`
- `/license/status`

## 11. Kết nối với backend

Frontend không generate content trực tiếp.

Nó chỉ chạm backend ở các route license/status.

Backend API mới là nơi:

- verify license
- bind site
- quyết định Free hay Pro
- tính quota thật

## 12. Kết nối với PocketBase

Frontend hiện đang đọc/ghi trực tiếp PocketBase ở browser cho `user_domains`.

Collection liên quan:

- `users`
- `user_domains`

Rule khuyến nghị cho `user_domains`:

- user chỉ đọc/ghi record của chính mình

Ví dụ:

```text
@request.auth.id != "" && user = @request.auth.id
```

## 13. Những file nên cẩn thận khi sửa

### `Header.astro`

Rủi ro:

- render động bằng JS
- mobile nav
- auth state
- style global cho dynamic nodes

### `dashboard.ts`

Rủi ro:

- logic add/delete domain
- usage/status sync
- render DOM bằng JS

Nếu sửa file này, nên kiểm tra lại:

- load domain
- add free site
- add pro site
- delete site
- chọn site active

### `runtime.ts`

Nếu đổi fallback URL ở đây, mọi page sẽ bị ảnh hưởng.

## 14. Những lỗi từng gặp

### CSS scoped không áp vào node render động

Đã từng xảy ra ở `Header.astro` và `dashboard.astro`.

Nguyên nhân:

- Astro scoped CSS không áp vào element được tạo bằng JS sau khi page load

Cách xử lý:

- dùng `style is:global` cho các class render động

### Dashboard gọi nhầm API production cũ

Đã từng xảy ra khi:

- `PUBLIC_API_URL` vẫn trỏ sang backend production chưa deploy route mới

Cách xử lý:

- kiểm tra đúng env
- kiểm tra backend có route `/api/license/status`

## 15. Quy ước khi phát triển tiếp

### Khi thêm page mới

- ưu tiên `.astro` nếu chủ yếu là markup + CSS
- chỉ tách logic sang `src/lib/*` nếu page có state hoặc DOM handling dài

### Khi thêm API integration mới

- không hardcode URL
- dùng `runtimeConfig`

### Khi thêm UI render động bằng JS

- cân nhắc `style is:global`
- hoặc render bằng Astro markup nếu có thể

### Khi thay đổi dashboard flow

Không dùng `user_domains.tier` làm source of truth cuối cùng.

Phải nhớ:

- entitlement thật nằm ở backend
- dashboard chỉ nên phản ánh backend, không tự phán đoán

## 16. Checklist test frontend

### Auth

- login Google thành công
- logout thành công
- callback về dashboard đúng

### Dashboard

- load danh sách website
- add website free
- add website với license key
- xóa website
- đổi website đang chọn

### Status

- site free hiện quota đúng
- site Pro hiện badge đúng
- site lỗi license hiện message đúng

### Download

- nút download tải đúng `plugin.zip`

### Responsive

- header mobile mở/đóng đúng
- dashboard không bể layout ở màn hình hẹp
- domain dài không đẩy vỡ card

## 17. Hướng tiếp theo

Nếu tiếp tục phát triển frontend, ưu tiên theo thứ tự:

1. tách tiếp logic `Header.astro` sang `src/lib/header.ts`
2. viết thêm docs release/deploy cho static hosting
3. khi sang V2, thêm dashboard billing UI cho Stripe
