<?php
/**
 * Plugin Name: ContentAI
 * Description: AI Content Writer + SEO Analyzer tích hợp vào Gutenberg Editor
 * Version: 1.0.0
 * Author: Phat
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CONTENTAI_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CONTENTAI_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('CONTENTAI_API_URL', 'https://api.contentai.vn/api');
define('CONTENTAI_FREE_LIMIT', 5);

// ============================================================
// ADMIN MENU — Sidebar với parent/child categories
// ============================================================

add_action('admin_menu', function () {
    // Parent menu
    add_menu_page(
        'ContentAI',
        'ContentAI',
        'edit_posts',
        'contentai',
        'contentai_dashboard_page',
        'dashicons-edit-large',
        25
    );

    // Sub-menus (categories)
    add_submenu_page('contentai', 'Dashboard', 'Dashboard', 'edit_posts', 'contentai', 'contentai_dashboard_page');
    add_submenu_page('contentai', 'Viết bài AI', 'Viết bài AI', 'edit_posts', 'contentai-write', 'contentai_write_page');
    add_submenu_page('contentai', 'Lịch nội dung', 'Lịch nội dung', 'edit_posts', 'contentai-calendar', 'contentai_calendar_page');
    add_submenu_page('contentai', 'Lịch sử', 'Lịch sử', 'edit_posts', 'contentai-history', 'contentai_history_page');
    add_submenu_page('contentai', 'Cài đặt', 'Cài đặt', 'manage_options', 'contentai-settings', 'contentai_settings_page');
});

function contentai_dashboard_page() {
    $used = contentai_get_used_count(get_current_user_id());
    ?>
    <div class="wrap">
        <h1>ContentAI — Dashboard</h1>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:20px; max-width:800px;">
            <div style="background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:20px;">
                <div style="font-size:28px; font-weight:700; color:#2563eb;"><?php echo esc_html($used); ?>/<?php echo CONTENTAI_FREE_LIMIT; ?></div>
                <div style="font-size:13px; color:#888; margin-top:4px;">Bài đã dùng tháng này</div>
            </div>
            <div style="background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:20px;">
                <div style="font-size:28px; font-weight:700; color:#16a34a;">Free</div>
                <div style="font-size:13px; color:#888; margin-top:4px;">Gói hiện tại</div>
            </div>
            <div style="background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:20px;">
                <div style="font-size:28px; font-weight:700; color:#d97706;">SEO</div>
                <div style="font-size:13px; color:#888; margin-top:4px;">Realtime analyzer</div>
            </div>
        </div>
        <div style="margin-top:24px;">
            <h3>Bắt đầu nhanh</h3>
            <p>Mở <strong>Gutenberg Editor</strong> (tạo/sửa bài viết) → sidebar ContentAI tự động hiện ra.</p>
            <a href="<?php echo admin_url('post-new.php'); ?>" class="button button-primary button-hero">Viết bài mới với AI</a>
        </div>
    </div>
    <?php
}

function contentai_write_page() {
    // Enqueue admin React app
    $dist_path = CONTENTAI_PLUGIN_PATH . 'dist/';
    $dist_url = CONTENTAI_PLUGIN_URL . 'dist/';

    if (file_exists($dist_path . 'admin.js')) {
        wp_enqueue_script(
            'contentai-admin',
            $dist_url . 'admin.js',
            [],
            filemtime($dist_path . 'admin.js'),
            true
        );

        // Enqueue admin CSS
        if (file_exists($dist_path . 'admin.css')) {
            wp_enqueue_style(
                'contentai-admin',
                $dist_url . 'admin.css',
                [],
                filemtime($dist_path . 'admin.css')
            );
        }

        $user_id = get_current_user_id();
        wp_localize_script('contentai-admin', 'contentaiData', [
            'apiUrl'    => CONTENTAI_API_URL,
            'token'     => contentai_generate_jwt($user_id),
            'userId'    => $user_id,
            'usedCount' => contentai_get_used_count($user_id),
            'freeLimit' => CONTENTAI_FREE_LIMIT,
            'isPro'     => false,
            'siteUrl'   => home_url(),
            'restUrl'   => esc_url_raw(rest_url()),
            'nonce'     => wp_create_nonce('wp_rest'),
            'adminUrl'  => admin_url(),
        ]);
    }
    ?>
    <div id="contentai-admin-root"></div>
    <?php
}

function contentai_calendar_page() {
    $dist_path = CONTENTAI_PLUGIN_PATH . 'dist/';
    $dist_url = CONTENTAI_PLUGIN_URL . 'dist/';

    if (file_exists($dist_path . 'calendar.js')) {
        wp_enqueue_script(
            'contentai-calendar',
            $dist_url . 'calendar.js',
            [],
            filemtime($dist_path . 'calendar.js'),
            true
        );

        if (file_exists($dist_path . 'calendar.css')) {
            wp_enqueue_style(
                'contentai-calendar',
                $dist_url . 'calendar.css',
                [],
                filemtime($dist_path . 'calendar.css')
            );
        }

        $user_id = get_current_user_id();
        wp_localize_script('contentai-calendar', 'contentaiData', [
            'restUrl'  => esc_url_raw(rest_url()),
            'nonce'    => wp_create_nonce('wp_rest'),
            'adminUrl' => admin_url(),
            'userId'   => $user_id,
        ]);
    }
    ?>
    <div id="contentai-calendar-root"></div>
    <?php
}

function contentai_history_page() {
    ?>
    <div class="wrap">
        <h1>Lịch sử Generate</h1>
        <p style="color:#888;">Danh sách các bài viết đã generate bằng AI.</p>
        <table class="wp-list-table widefat fixed striped" style="max-width:900px;">
            <thead>
                <tr>
                    <th>Keyword</th>
                    <th>Loại</th>
                    <th>Ngày</th>
                    <th>Trạng thái</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="4" style="text-align:center; padding:24px; color:#999;">Chưa có lịch sử. Hãy thử generate bài đầu tiên!</td></tr>
            </tbody>
        </table>
    </div>
    <?php
}

function contentai_settings_page() {
    ?>
    <div class="wrap">
        <h1>Cài đặt ContentAI</h1>
        <form method="post" action="options.php" style="max-width:600px;">
            <table class="form-table">
                <tr>
                    <th>API URL</th>
                    <td><input type="text" value="<?php echo esc_attr(CONTENTAI_API_URL); ?>" class="regular-text" disabled />
                    <p class="description">Endpoint API Node.js backend</p></td>
                </tr>
                <tr>
                    <th>Gói hiện tại</th>
                    <td><strong style="color:#16a34a;">Free</strong> — <?php echo CONTENTAI_FREE_LIMIT; ?> bài/tháng
                    <br><a href="https://contentai.vn/pro" target="_blank">Nâng cấp Pro →</a></td>
                </tr>
                <tr>
                    <th>Giọng văn mặc định</th>
                    <td>
                        <select class="regular-text">
                            <option>Chuyên nghiệp</option>
                            <option>Thân thiện</option>
                            <option>Thuyết phục</option>
                            <option>Đơn giản</option>
                        </select>
                    </td>
                </tr>
            </table>
        </form>
    </div>
    <?php
}

// ============================================================
// GUTENBERG — Enqueue editor script + CSS
// ============================================================

// Enqueue editor script + CSS cho Gutenberg
add_action('enqueue_block_editor_assets', function () {
    $dist_path = CONTENTAI_PLUGIN_PATH . 'dist/';
    $dist_url = CONTENTAI_PLUGIN_URL . 'dist/';

    if (!file_exists($dist_path . 'editor.js')) {
        return;
    }

    // Enqueue JS với dependencies WordPress
    wp_enqueue_script(
        'contentai-editor',
        $dist_url . 'editor.js',
        [
            'wp-plugins',
            'wp-editor',
            'wp-edit-post',
            'wp-element',
            'wp-components',
            'wp-data',
            'wp-i18n',
            'wp-blocks',
            'wp-block-editor',
            'wp-rich-text',
        ],
        filemtime($dist_path . 'editor.js'),
        true
    );

    // Enqueue tất cả CSS files từ dist/
    $css_files = glob($dist_path . '*.css');
    if ($css_files) {
        foreach ($css_files as $css_file) {
            $filename = basename($css_file, '.css');
            wp_enqueue_style(
                "contentai-{$filename}",
                $dist_url . basename($css_file),
                [],
                filemtime($css_file)
            );
        }
    }

    // CSS cho left panel layout injection
    wp_add_inline_style("contentai-editor", contentai_get_layout_css());

    // Inject data cho React (window.contentaiData)
    $user_id = get_current_user_id();
    $token = contentai_generate_jwt($user_id);
    $used_count = contentai_get_used_count($user_id);

    wp_localize_script('contentai-editor', 'contentaiData', [
        'apiUrl'    => CONTENTAI_API_URL,
        'token'     => $token,
        'userId'    => $user_id,
        'usedCount' => $used_count,
        'freeLimit' => CONTENTAI_FREE_LIMIT,
        'isPro'     => false,
        'siteUrl'   => home_url(),
    ]);
});

/**
 * CSS layout cho left panel injection vào Gutenberg editor.
 * Điều chỉnh editor content area khi left panel mở.
 */
function contentai_get_layout_css() {
    return '
        /* Left panel container inject vào editor */
        #contentai-left-panel {
            flex-shrink: 0;
            height: calc(100vh - 56px);
            position: sticky;
            top: 0;
            z-index: 90;
            overflow: hidden;
        }

        /* Khi left panel mở, editor content area co lại */
        .contentai-left-open .edit-post-layout__content,
        .contentai-left-open .editor-editor-interface__content,
        .contentai-left-open .interface-interface-skeleton__content {
            display: flex !important;
            flex-direction: row !important;
        }

        .contentai-left-open .edit-post-visual-editor,
        .contentai-left-open .editor-visual-editor,
        .contentai-left-open .interface-interface-skeleton__editor {
            flex: 1;
            min-width: 0;
        }
    ';
}

// Thêm type="module" cho script Vite output
add_filter('script_loader_tag', function ($tag, $handle) {
    if ($handle === 'contentai-editor' || $handle === 'contentai-admin' || $handle === 'contentai-calendar') {
        $tag = str_replace(' src=', ' type="module" src=', $tag);
    }
    return $tag;
}, 10, 2);

/**
 * Generate JWT token cho user.
 * TODO: Thay bằng logic JWT thật khi có Node.js backend
 */
function contentai_generate_jwt($user_id) {
    $secret = defined('CONTENTAI_JWT_SECRET') ? CONTENTAI_JWT_SECRET : 'change-this-secret';
    $payload = [
        'user_id' => $user_id,
        'site'    => home_url(),
        'exp'     => time() + 3600,
    ];
    $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload_encoded = base64_encode(json_encode($payload));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload_encoded", $secret, true));
    return "$header.$payload_encoded.$signature";
}

/**
 * Lấy số bài đã generate tháng này.
 * TODO: Thay bằng API call thật hoặc đọc từ DB
 */
function contentai_get_used_count($user_id) {
    $option_key = "contentai_used_{$user_id}_" . date('Y_m');
    return (int) get_option($option_key, 0);
}
