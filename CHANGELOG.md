# Changelog

## Version 1 - 2026-04-15

### Tổng quan
- Chốt bản V1 với 3 khối chạy ổn định hơn: `api`, `frontend`, `wp-content/plugins/contentai-plugin`.
- Hoàn thiện flow `free tier chạy thật` và `Pro demo bằng license key`.
- Đồng bộ lại PocketBase schema, frontend dashboard, plugin WordPress và backend license/quota.

### Backend API
- Refactor backend theo hướng `routes -> usecases -> services/agents`.
- Tách cụm license thành:
  - `licenseMiddleware.ts`
  - `licenseService.ts`
  - `licenseStorage.ts`
  - `licenseTypes.ts`
- Thêm endpoint `POST /api/license/status` để frontend/dashboard đọc trạng thái thật từ backend.
- Siết lại auth/quota:
  - free key không còn bypass quota nếu thiếu `x-site-url`
  - verify/activate license có bind theo website
  - `/api/logs` không còn mở tự do
- Sửa activate license để không hồi sinh key `revoked` hoặc `expired`.
- Thêm cache invalidation sau activate/gia hạn để trạng thái license cập nhật ngay.
- Dọn file cũ/thừa:
  - bỏ `src/services/pocketbase.ts`
  - bỏ `pocketbase-types.ts`
  - bỏ các docs backend cũ và thay bằng `api/ARCHITECTURE.md`

### PocketBase
- Chuẩn hóa schema cho:
  - `licenses`
  - `usage`
  - `user_domains`
- Đổi `user_domains` sang relation `user -> users`.
- Sửa `usage` sang model `domain_id + month`.
- Bỏ migration cũ `3_usage_logs.json`.
- Cập nhật script `pb_migrations/sync_to_pb.ts` theo env/runtime hiện tại.

### Frontend
- Refactor dashboard:
  - tách logic sang `src/lib/dashboard.ts`
  - gom config runtime vào `src/lib/runtime.ts`
  - gom helper PocketBase vào `src/lib/pocketbase.ts`
- Dashboard giờ đọc trạng thái website từ backend qua `/api/license/status`, không còn tự suy luận quota/tier rời rạc.
- Header badge `Free/Pro` bám entitlement thật từ backend tốt hơn.
- Đổi frontend Astro từ `server` sang `static`.
- Bỏ route server `/api/download`; tải plugin giờ trỏ thẳng `public/plugin.zip`.
- Thiết kế lại landing, login và dashboard với visual system mới:
  - typography mới
  - palette mới
  - layout/card/button đồng bộ hơn
  - có mobile navigation thật
  - responsive và motion nhẹ tốt hơn

### WordPress Plugin
- Đồng bộ plugin với backend contract mới.
- Sửa rewrite toolbar để hành vi gần đúng “rewrite” hơn thay vì prepend sai chỗ.
- Sửa timezone schedule để giờ lên lịch khớp hơn giữa UI và WordPress.
- Đổi form giờ sang `AM/PM`.
- Bỏ các control thừa hoặc giả:
  - bỏ `Tone`
  - bỏ `Độ dài`
  - bỏ nút `Thử lại`
  - bỏ nút `Ngắn hơn` giả
- Dọn settings/admin cũ không còn dùng.
- Build lại asset plugin và thêm `TESTING.md`.

### Tài liệu
- Thêm:
  - `docs/ARCHITECTURE.md`
  - `docs/TECH_DEBT.md`
  - `docs/V2_STRIPE_BILLING.md`
  - `api/ARCHITECTURE.md`
- Chốt định hướng:
  - V1: free thật + Pro demo
  - V2: tích hợp Stripe

### Build và kiểm tra
- `deno lint api/src` pass
- `deno check api/src/main.ts` pass
- Astro frontend build pass
- Plugin frontend assets đã được build lại
