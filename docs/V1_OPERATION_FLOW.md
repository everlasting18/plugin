# ContentAI V1 Operation Flow

## Mục tiêu

Tài liệu này mô tả luồng hoạt động thật của hệ thống ở V1.
Mục tiêu là để một người mới vào project có thể trả lời nhanh:

- user đăng nhập xong làm gì
- website được gắn vào tài khoản ra sao
- free quota được check thế nào
- Pro demo verify ra sao
- plugin gọi backend như thế nào

## Flow tổng quát

```text
User
  -> Frontend login bằng PocketBase
  -> Dashboard thêm website
  -> Dashboard có thể verify license key
  -> Plugin WordPress gọi API backend
  -> Backend verify Free/Pro
  -> Backend generate nội dung
  -> Backend cập nhật usage nếu là free
```

## 1. Flow đăng nhập

### Bước 1

User vào:

- `/login`

Frontend dùng PocketBase JS SDK để login Google.

### Bước 2

Sau khi login thành công:

- PocketBase auth store được lưu ở browser
- frontend sync auth vào cookie
- user được chuyển sang `/dashboard`

## 2. Flow dashboard

### Mục tiêu dashboard

Dashboard hiện làm 4 việc:

- hiện thông tin user
- hiện danh sách website
- thêm website mới
- hiện status/quota thật từ backend

### Dữ liệu dashboard đọc từ đâu

#### Từ PocketBase

Dashboard đọc `user_domains` để biết:

- user đang có những website nào
- website nào đang gắn `license_key`
- website nào đang `is_active`

#### Từ backend API

Dashboard gọi:

- `POST /api/license/status`

để biết trạng thái thật:

- site hiện là `free` hay `pro`
- license key còn hợp lệ hay không
- quota còn bao nhiêu nếu là free

## 3. Flow thêm website free

### Bước 1

User nhập domain ở dashboard.

Ví dụ:

- `https://example.com`

Không nhập license key.

### Bước 2

Frontend normalize domain về `origin`.

Ví dụ:

- `https://example.com/post/abc`
  -> `https://example.com`

### Bước 3

Frontend tạo record trong `user_domains`:

- `user`
- `domain`
- `tier = free`
- `license_key = ""`
- `is_active`

### Bước 4

Dashboard gọi `/api/license/status`

Backend sẽ trả:

- `tier = free`
- `isPro = false`
- `usage`

## 4. Flow thêm website Pro demo

### Bước 1

User nhập:

- `domain`
- `license_key`

### Bước 2

Frontend gọi:

- `POST /api/license/verify`

Payload:

```json
{
  "key": "DEMO-PRO-XXXX",
  "site_url": "https://example.com"
}
```

### Bước 3

Backend verify:

- key có tồn tại không
- status có phải `active` không
- có hết hạn chưa
- site binding có hợp lệ không

Nếu hợp lệ:

- backend activate/bind key với site

### Bước 4

Frontend tạo record `user_domains` với:

- `tier = pro`
- `license_key = key`

### Bước 5

Dashboard gọi `/api/license/status`

Backend trả:

- `isPro = true`
- `licenseValid = true`

## 5. Flow plugin generate

Đây là flow quan trọng nhất của V1.

### Plugin gửi gì

Plugin WordPress gọi backend với:

- `x-site-url`
- `x-license-key` nếu có

và body JSON như:

- `keyword`
- `count`
- `audience`
- `framework`
- `language`
- `webSearch`

### Route entry

Request vào:

- `POST /api/generate`

Thứ tự xử lý:

1. `main.ts`
2. `routes/mod.ts`
3. `licenseMiddleware.ts`
4. `routes/generate.ts`
5. `usecases/generate.ts`
6. `agents/orchestrator.ts`

## 6. License middleware flow

### Nếu có `x-license-key`

Backend đi nhánh Pro:

- verify key
- verify `x-site-url`
- check site binding

Nếu pass:

- request được cho qua
- không dùng quota free

### Nếu không có `x-license-key`

Backend đi nhánh Free:

- bắt buộc phải có `x-site-url`
- normalize domain
- tính `domain_id`
- lookup `usage` theo:
  - `domain_id`
  - `month`

Nếu còn quota:

- request được cho qua

Nếu hết quota:

- trả lỗi limit

## 7. Generate pipeline

### Research

`research.ts`:

- build search query
- gọi Tavily nếu bật web search
- tổng hợp structured research data

### Writer

`writer.ts`:

- nhận research data
- nhận framework
- tạo draft HTML/Gutenberg blocks

### Editor gate

`editorGate.ts`:

- check nhanh bằng rule
- nếu đạt thì không cần editor AI sâu hơn

### Editor review

Nếu gate fail:

- `editor.ts` review
- có thể tạo 1 vòng revision

### Done

`orchestrator.ts` stream progress line về client và kết thúc bằng `[DONE]`

## 8. Free quota increment

### Thời điểm cộng usage

Free quota không cộng ở middleware.

Nó chỉ được cộng:

- sau khi generate thành công
- dựa trên số bài thực tế trả ra

### Vì sao

Để tránh:

- request fail nhưng vẫn mất quota
- count sai nếu số bài trả về thực tế khác request ban đầu

## 9. Flow rewrite

### Từ plugin

Floating toolbar hoặc panel gửi:

- text đang chọn
- rewrite instruction

### Ở backend

Request đi qua license middleware giống generate.

Route:

- `POST /api/rewrite`

Usecase:

- validate input text
- gọi model rewrite

### Kết quả

Plugin nhận text mới và chèn lại vào Gutenberg theo flow hiện tại.

## 10. Flow meta

### Từ plugin

Plugin có thể gọi:

- `POST /api/meta`

### Mục tiêu

Sinh:

- meta title
- meta description

theo keyword hoặc theo nội dung hiện có.

## 11. Flow calendar và schedule

### Trong plugin

Calendar app làm:

- xem lịch nội dung
- schedule bài viết
- convert time đúng với timezone site

### Tại sao phải cẩn thận timezone

WordPress lưu:

- `post_date`
- `post_date_gmt`

Nếu convert sai:

- user chọn 20:00 nhưng WordPress hiện 13:00

V1 đã fix flow này để giờ schedule khớp hơn.

## 12. Flow download plugin

V1 hiện không bắt login để download plugin nữa.

Frontend Astro đã chuyển sang static.

Nút download trỏ thẳng:

- `/plugin.zip`

Tức là:

- không còn route server `/api/download`
- không cần login để lấy file zip

## 13. Source of truth theo từng phần

### User identity

- PocketBase `users`

### User sở hữu website nào

- PocketBase `user_domains`

### Website đó có Pro thật không

- backend API qua `licenses`

### Website free còn bao nhiêu quota

- backend API qua `usage`

### Content tạo ra

- backend orchestrator output

## 14. Điều quan trọng cần nhớ

### `user_domains.tier` không phải nguồn cuối

Field này chỉ để tiện hiển thị hoặc ghi lại intent lúc add website.

Entitlement thật vẫn phải hỏi backend.

### Frontend và plugin không quyết định auth

Chúng chỉ gửi request.

Backend mới là nơi quyết định:

- cho generate hay không
- free hay pro
- còn quota hay không

### V1 là free thật + Pro demo

V1 chưa có Stripe.

Pro hiện tại là:

- manual/demo key
- verify bằng backend
- bind theo website

## 15. Hướng nâng cấp V2

V2 sẽ thêm:

- Stripe checkout
- webhook
- auto create/update license

Nhưng plugin flow vẫn giữ nguyên:

- plugin vẫn chỉ gửi `x-site-url`
- và `x-license-key` nếu là Pro

Xem thêm:

- `docs/V2_STRIPE_BILLING.md`
