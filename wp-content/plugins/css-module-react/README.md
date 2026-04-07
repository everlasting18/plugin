# CSS Module React - WordPress Plugin

Plugin WordPress sử dụng **React + CSS Modules** (build bằng Vite) để tránh xung đột class name giữa plugin, theme và các plugin khác.

## Vấn đề cần giải quyết

Khi viết CSS trong WordPress, class name dễ bị trùng:

```css
/* Plugin A */
.container { background: red; }

/* Plugin B */
.container { background: blue; } /* → Đè lên Plugin A! */
```

**CSS Modules** giải quyết bằng cách tự động hash class name:

```css
/* Trước (code bạn viết) */
.container { background: red; }

/* Sau (trình duyệt nhận được) */
.App_container_x7d2k { background: red; }  /* Unique, không đè ai */
```

## Cách dùng CSS Modules trong React

```jsx
// Import file .module.css → nhận object chứa class names đã hash
import styles from './App.module.css';

// Dùng styles.className thay vì string
function App() {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Hello</h1>
      <button className={`${styles.button} ${styles.primary}`}>Click</button>
    </div>
  );
}
```

```css
/* App.module.css */
.container { max-width: 800px; }
.heading { color: #333; }
.button { padding: 10px 20px; }
.primary { background: blue; color: white; }
```

**Kết quả HTML:**

```html
<div class="App_container_x7d2k">
  <h1 class="App_heading_a3b1c">Hello</h1>
  <button class="App_button_f2e8d App_primary_g9h4j">Click</button>
</div>
```

## Cấu trúc Plugin

```
css-module-react/
├── css-module-react.php          # File plugin chính (PHP)
├── package.json                  # Dependencies (React, Vite)
├── vite.config.js                # Cấu hình build
├── src/
│   ├── admin/                    # React app cho trang Admin
│   │   ├── index.jsx             # Entry point
│   │   ├── App.jsx               # Component chính
│   │   └── App.module.css        # CSS Module
│   ├── frontend/                 # React app cho Frontend (shortcode)
│   │   ├── index.jsx
│   │   ├── App.jsx
│   │   └── App.module.css
│   └── components/               # Shared components
│       ├── Button/
│       │   ├── Button.jsx
│       │   └── Button.module.css
│       └── Card/
│           ├── Card.jsx
│           └── Card.module.css
└── dist/                         # Output sau khi build (tự tạo)
```

## Cài đặt & Chạy

```bash
# 1. Vào thư mục plugin
cd wp-content/plugins/css-module-react

# 2. Cài dependencies
npm install

# 3. Build production
npm run build

# 4. Dev mode (auto rebuild khi sửa code)
npm run dev
```

Sau đó vào WordPress Admin → Plugins → Activate **"CSS Module React"**.

## Sử dụng

### Admin Page
Vào sidebar admin → **CSS Module React** → thấy React app với counter demo.

### Frontend (Shortcode)
Thêm shortcode vào bất kỳ page/post:

```
[css_module_react]
```

## Giải thích các file quan trọng

### `vite.config.js` - Cấu hình Build

```js
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',                    // Output vào thư mục dist/
    rollupOptions: {
      input: {
        admin: 'src/admin/index.jsx',      // Entry point admin
        frontend: 'src/frontend/index.jsx', // Entry point frontend
      },
      output: {
        entryFileNames: '[name].js',   // admin.js, frontend.js
      },
    },
  },
  css: {
    modules: {
      // Format class name: TenFile_tenClass_hash
      generateScopedName: '[name]_[local]_[hash:base64:5]',
    },
  },
});
```

### `css-module-react.php` - WordPress Integration

**Đăng ký Admin Page:**
```php
add_action('admin_menu', function () {
    add_menu_page('CSS Module React', ...);
});
```

**Enqueue JS/CSS:**
```php
// Load JS với type="module" (vì Vite output ES modules)
wp_enqueue_script('cmr-admin-js', $dist_url . 'admin.js', ...);

// Load tất cả CSS files từ dist/
cmr_enqueue_all_css('admin');
```

**Script type="module"** - Vite build ra ES modules (dùng `import`), nên cần thêm `type="module"`:
```php
add_filter('script_loader_tag', function ($tag, $handle) {
    if (in_array($handle, ['cmr-admin-js', 'cmr-frontend-js'])) {
        $tag = str_replace(' src=', ' type="module" src=', $tag);
    }
    return $tag;
}, 10, 2);
```

**Shortcode:**
```php
add_shortcode('css_module_react', function () {
    wp_enqueue_script('cmr-frontend-js', ...);
    cmr_enqueue_all_css('frontend');
    return '<div id="css-module-react-frontend"></div>';
});
```

## Tạo Component mới với CSS Modules

### 1. Tạo file component

```
src/components/Alert/
├── Alert.jsx
└── Alert.module.css
```

### 2. Viết CSS Module

```css
/* Alert.module.css */
.alert {
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid;
}

.success {
  background: #d4edda;
  border-color: #c3e6cb;
  color: #155724;
}

.error {
  background: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}
```

### 3. Viết React Component

```jsx
// Alert.jsx
import styles from './Alert.module.css';

export default function Alert({ type = 'success', children }) {
  return (
    <div className={`${styles.alert} ${styles[type]}`}>
      {children}
    </div>
  );
}
```

### 4. Import và dùng

```jsx
import Alert from '../components/Alert/Alert';

<Alert type="success">Thao tác thành công!</Alert>
<Alert type="error">Có lỗi xảy ra!</Alert>
```

## So sánh với các cách khác

| Cách | Xung đột? | Cần build? | Dễ dùng? |
|------|-----------|------------|----------|
| CSS thường | Có | Không | Dễ |
| BEM naming (.block__element--modifier) | Ít hơn | Không | Trung bình |
| CSS-in-JS (styled-components) | Không | Có | Trung bình |
| **CSS Modules** | **Không** | **Có** | **Dễ** |

CSS Modules là lựa chọn tốt nhất khi dùng React trong WordPress vì:
- Viết CSS bình thường (không cần học syntax mới)
- Class name tự động unique
- Vite hỗ trợ sẵn, không cần cài thêm gì
