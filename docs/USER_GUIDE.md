# ContentAI User Guide

Tài liệu này dành cho người dùng cuối của ContentAI.

Mục tiêu:

- biết bắt đầu từ đâu
- biết cài plugin vào WordPress
- biết kết nối website với tài khoản
- biết dùng generate, rewrite và lịch nội dung
- biết xử lý các lỗi thường gặp

## 1. ContentAI là gì

ContentAI là bộ công cụ viết bài AI cho WordPress.

Bạn có thể dùng ContentAI để:

- tạo bài viết từ keyword
- rewrite đoạn văn ngay trong Gutenberg
- tạo meta title và meta description
- lên lịch bài viết trong calendar

ContentAI gồm 2 phần:

- website/dashboard để đăng nhập, quản lý website và license
- plugin WordPress để dùng trực tiếp trong Gutenberg

## 2. Bạn cần gì trước khi bắt đầu

Trước khi dùng ContentAI, bạn cần:

- một website WordPress
- quyền cài plugin trên website đó
- một tài khoản Google để đăng nhập ContentAI

Nếu bạn dùng bản miễn phí:

- không cần license key

Nếu bạn dùng bản Pro:

- cần license key hợp lệ

## 3. Bắt đầu nhanh

Luồng nhanh nhất để dùng ContentAI:

1. Đăng nhập bằng Google
2. Vào dashboard
3. Thêm website WordPress của bạn
4. Tải plugin `contentai-plugin.zip`
5. Cài plugin vào WordPress
6. Kết nối plugin với website của bạn
7. Mở Gutenberg và bắt đầu viết

## 4. Đăng nhập

### Bước 1

Mở trang login của ContentAI.

### Bước 2

Bấm:

- `Đăng nhập với Google`

### Bước 3

Sau khi đăng nhập thành công, bạn sẽ được chuyển sang:

- `Dashboard`

## 5. Dashboard dùng để làm gì

Dashboard là nơi bạn:

- xem tài khoản hiện tại
- thêm website WordPress
- nhập license key nếu có
- xem trạng thái Free hoặc Pro
- xem quota miễn phí còn lại
- tải plugin zip

## 6. Thêm website vào tài khoản

### Trường hợp Free

Nếu bạn dùng bản miễn phí:

1. vào dashboard
2. nhập domain website
3. để trống ô `License Key`
4. bấm `Thêm website`

Ví dụ domain đúng:

- `https://example.com`
- `http://localhost`

### Trường hợp Pro

Nếu bạn có license key:

1. vào dashboard
2. nhập domain website
3. nhập license key
4. bấm `Thêm website`

Nếu license key hợp lệ:

- website sẽ được kích hoạt trạng thái `Pro`

Nếu license key không hợp lệ:

- dashboard sẽ báo lỗi ngay

### Lưu ý khi nhập domain

Bạn nên nhập đúng domain gốc của website.

Ví dụ đúng:

- `https://example.com`

Ví dụ không nên nhập:

- `https://example.com/post/demo`
- `example.com`

## 7. Quota miễn phí hoạt động như thế nào

Với bản Free:

- mỗi website có quota riêng
- quota được tính theo tháng

Ví dụ:

- website A còn `4 / 5`
- website B còn `5 / 5`

Điều này có nghĩa:

- quota không cộng chung cho tất cả website
- mỗi website được tính riêng

## 8. Tải plugin

Trong dashboard, bạn sẽ thấy nút:

- `Tải về`

File tải xuống là:

- `contentai-plugin.zip`

Bạn chỉ cần tải file này về máy.

## 9. Cài plugin vào WordPress

### Cách cài

1. vào WordPress Admin
2. vào `Plugins`
3. chọn `Add New`
4. chọn `Upload Plugin`
5. chọn file `contentai-plugin.zip`
6. bấm `Install Now`
7. bấm `Activate`

### Sau khi activate

Plugin sẽ xuất hiện trong WordPress admin.

## 10. Kết nối plugin với website

Sau khi cài plugin:

1. vào trang settings của plugin
2. nhập đúng domain website
3. nếu có Pro thì nhập license key
4. lưu cấu hình

### Với bản Free

Chỉ cần:

- domain đúng

### Với bản Pro

Cần:

- domain đúng
- license key đúng

### Lưu ý

Domain trong plugin nên khớp với domain bạn đã thêm ở dashboard.

Ví dụ:

- dashboard: `https://example.com`
- plugin: `https://example.com`

Không nên để một nơi là `http` còn nơi kia là `https` nếu site thật đang chạy `https`.

## 11. Bắt đầu dùng trong Gutenberg

Sau khi plugin đã được cấu hình:

1. mở một bài viết trong WordPress
2. vào Gutenberg editor
3. mở panel ContentAI

Từ đây bạn có thể:

- nhập keyword
- chọn framework nếu cần
- bật/tắt web research
- generate bài viết

## 12. Tạo bài viết mới

### Cách dùng

1. nhập keyword
2. chọn số bài muốn tạo
3. chọn các thiết lập cần thiết
4. bấm `Tạo`

### Hệ thống sẽ làm gì

ContentAI sẽ:

1. research thông tin
2. chọn framework phù hợp
3. viết draft
4. review lại chất lượng
5. trả kết quả về editor

### Sau khi hoàn tất

Bạn có thể:

- chèn bài vào editor
- copy nội dung
- tiếp tục chỉnh thủ công

## 13. Rewrite đoạn văn

ContentAI hỗ trợ rewrite ngay trong Gutenberg.

### Cách dùng

1. bôi chọn đoạn văn bạn muốn sửa
2. mở floating toolbar
3. chọn rewrite

### Mục đích

Bạn có thể dùng rewrite để:

- làm câu gọn hơn
- viết lại mượt hơn
- đổi cách diễn đạt

## 14. Meta title và meta description

ContentAI có thể hỗ trợ tạo:

- meta title
- meta description

Mục đích:

- tối ưu SEO nhanh hơn
- giảm thao tác thủ công sau khi bài viết đã xong

## 15. Calendar và lên lịch bài viết

Plugin có calendar để quản lý lịch nội dung.

Bạn có thể:

- xem bài đã lên lịch
- chọn ngày giờ đăng
- sắp xếp bài theo lịch

### Lưu ý về giờ

ContentAI đã xử lý timezone tốt hơn, nhưng bạn vẫn nên:

- kiểm tra timezone trong WordPress
- xác nhận lại giờ publish sau khi schedule

Nếu website của bạn không dùng UTC, hãy luôn kiểm tra giờ hiển thị trong WordPress sau khi lên lịch.

## 16. Bản Free và bản Pro khác nhau như thế nào

### Free

Phù hợp để:

- thử sản phẩm
- chạy website nhỏ
- làm quen với flow của plugin

Đặc điểm:

- có quota theo tháng
- không cần license key

### Pro

Phù hợp để:

- viết nội dung thường xuyên
- bỏ giới hạn quota miễn phí
- dùng website đã kích hoạt bằng key

Đặc điểm:

- cần license key hợp lệ
- website phải được bind đúng với key

## 17. Khi nào website hiện Free, khi nào hiện Pro

Website sẽ hiện `Free` nếu:

- bạn không nhập license key
- hoặc key nhập vào không hợp lệ
- hoặc key đã hết hạn / không còn hiệu lực

Website sẽ hiện `Pro` nếu:

- license key hợp lệ
- website được kích hoạt đúng domain

## 18. Những lỗi thường gặp

### 1. Không thêm được website

Nguyên nhân thường gặp:

- domain nhập sai
- domain thiếu `http://` hoặc `https://`
- website đó đã tồn tại trong tài khoản

Cách xử lý:

- nhập đúng domain gốc
- dùng đúng giao thức

### 2. License key không hợp lệ

Nguyên nhân thường gặp:

- key gõ sai
- key hết hạn
- key không dành cho website này

Cách xử lý:

- kiểm tra lại key
- kiểm tra đúng domain
- liên hệ quản trị nếu key đã hết hạn

### 3. Generate bị chặn dù đã login

Nguyên nhân thường gặp:

- plugin chưa nhập đúng domain
- website chưa được thêm ở dashboard
- bản Free đã hết quota tháng

Cách xử lý:

- kiểm tra domain trong plugin
- kiểm tra website trong dashboard
- xem quota còn lại

### 4. Giờ schedule bị lệch

Nguyên nhân thường gặp:

- timezone WordPress không đúng
- site dùng timezone khác so với kỳ vọng

Cách xử lý:

- vào WordPress Settings
- kiểm tra timezone
- schedule lại và xác nhận giờ publish

### 5. Không thấy panel ContentAI trong Gutenberg

Nguyên nhân thường gặp:

- plugin chưa activate
- asset plugin chưa đúng
- đang ở màn hình không phải editor

Cách xử lý:

- kiểm tra plugin đã activate chưa
- reload editor
- thử mở lại một bài viết khác

## 19. Best practice khi dùng ContentAI

Để kết quả tốt hơn, bạn nên:

- dùng keyword rõ nghĩa
- không yêu cầu quá nhiều bài trong một lượt nếu đang test
- review lại nội dung trước khi publish
- kiểm tra meta title và description trước khi đăng
- với site thật, nên dùng `https://` thống nhất ở dashboard và plugin

## 20. Hướng phát triển tiếp

Hiện tại V1 đang là:

- Free hoạt động thật
- Pro demo/manual bằng license key

Trong V2, hệ thống dự kiến thêm:

- thanh toán Stripe
- kích hoạt Pro tự động sau khi thanh toán

## 21. Checklist bắt đầu dùng

Nếu bạn chỉ cần checklist nhanh:

1. đăng nhập Google
2. thêm website vào dashboard
3. tải `contentai-plugin.zip`
4. cài vào WordPress
5. nhập domain và license key nếu có
6. mở Gutenberg
7. tạo bài viết đầu tiên
