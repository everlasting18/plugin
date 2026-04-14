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

// Detect environment: local dev uses localhost API, production uses api.contentai.vn
function contentai_get_api_url() {
    $site_url = home_url();
    $is_local = (strpos($site_url, 'localhost') !== false || strpos($site_url, '127.0.0.1') !== false);
    return $is_local ? 'http://localhost:3000/api' : 'https://2ijcf5f4gz4hucy.591p.pocketbasecloud.com/api';
}

define('CONTENTAI_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CONTENTAI_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('CONTENTAI_API_URL', contentai_get_api_url());
define('CONTENTAI_FREE_LIMIT', 5);

function contentai_user_can_edit_posts() {
    return current_user_can('edit_posts');
}

function contentai_parse_query_boundary($value, $timezone = null) {
    $value = trim((string) $value);
    if ($value === '') {
        return null;
    }

    if ($timezone instanceof DateTimeZone) {
        try {
            $date = new DateTime($value, $timezone);
            $date->setTimezone(new DateTimeZone('UTC'));
            return $date->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            return null;
        }
    }

    $timestamp = strtotime($value);
    if ($timestamp === false) {
        return null;
    }

    return gmdate('Y-m-d H:i:s', $timestamp);
}

function contentai_build_posts_query_args($status, $after = '', $before = '', $after_local = '', $before_local = '') {
    $allowed_statuses = ['draft', 'publish', 'future'];
    $statuses = array_values(array_intersect(
        array_filter(array_map('sanitize_key', array_map('trim', explode(',', (string) $status)))),
        $allowed_statuses
    ));

    if (empty($statuses)) {
        $statuses = ['draft'];
    }

    $args = [
        'post_type'      => 'post',
        'post_status'    => count($statuses) === 1 ? $statuses[0] : $statuses,
        'posts_per_page' => 100,
        'orderby'        => 'date',
        'order'          => 'desc',
    ];

    $date_query = ['inclusive' => true, 'column' => 'post_date_gmt'];
    $after_gmt = contentai_parse_query_boundary($after_local, wp_timezone()) ?? contentai_parse_query_boundary($after);
    $before_gmt = contentai_parse_query_boundary($before_local, wp_timezone()) ?? contentai_parse_query_boundary($before);

    if ($after_gmt !== null) {
        $date_query['after'] = $after_gmt;
    }
    if ($before_gmt !== null) {
        $date_query['before'] = $before_gmt;
    }
    if (isset($date_query['after']) || isset($date_query['before'])) {
        $args['date_query'] = [$date_query];
    }

    return $args;
}

function contentai_get_usage_info($site_url = '') {
    $domain = $site_url ?: home_url();
    $response = wp_remote_post(CONTENTAI_API_URL . '/license/usage', [
        'body'    => json_encode(['domain' => $domain]),
        'headers' => ['Content-Type' => 'application/json'],
        'timeout' => 15,
    ]);

    if (is_wp_error($response)) {
        return [
            'count'     => 0,
            'limit'     => CONTENTAI_FREE_LIMIT,
            'remaining' => CONTENTAI_FREE_LIMIT,
            'allowed'   => true,
            'available' => false,
            'message'   => $response->get_error_message(),
        ];
    }

    $status_code = (int) wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($status_code < 200 || $status_code >= 300) {
        return [
            'count'     => 0,
            'limit'     => CONTENTAI_FREE_LIMIT,
            'remaining' => CONTENTAI_FREE_LIMIT,
            'allowed'   => true,
            'available' => false,
            'message'   => is_array($body)
                ? (string) ($body['message'] ?? 'Không đọc được quota từ API.')
                : 'Không đọc được quota từ API.',
        ];
    }

    if (!is_array($body)) {
        return [
            'count'     => 0,
            'limit'     => CONTENTAI_FREE_LIMIT,
            'remaining' => CONTENTAI_FREE_LIMIT,
            'allowed'   => true,
            'available' => false,
            'message'   => 'Usage response không hợp lệ.',
        ];
    }

    return [
        'count'     => (int) ($body['count'] ?? 0),
        'limit'     => (int) ($body['limit'] ?? CONTENTAI_FREE_LIMIT),
        'remaining' => (int) ($body['remaining'] ?? CONTENTAI_FREE_LIMIT),
        'allowed'   => (bool) ($body['allowed'] ?? true),
        'available' => true,
        'message'   => '',
    ];
}

// ============================================================
// LICENSE FUNCTIONS
// ============================================================

function contentai_verify_license($key, $site_url) {
    $response = wp_remote_post(CONTENTAI_API_URL . '/license/verify', [
        'body'    => json_encode(['key' => $key, 'site_url' => $site_url]),
        'headers' => ['Content-Type' => 'application/json'],
        'timeout' => 15,
    ]);

    if (is_wp_error($response)) {
        return [
            'valid'  => false,
            'tier'   => 'free',
            'expires' => null,
            'message' => 'Không thể kết nối license server.',
        ];
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    return $body ?: [
        'valid'   => false,
        'tier'    => 'free',
        'expires' => null,
        'message' => 'License response không hợp lệ.',
    ];
}

function contentai_check_license_status() {
    $key = get_option('contentai_license_key', '');
    if (empty($key)) {
        return ['tier' => 'free', 'valid' => false, 'expires' => null, 'message' => ''];
    }

    $site_url   = home_url();
    $last_check = (int) get_option('contentai_license_last_check', 0);
    $now       = time();

    // Re-verify every 24 hours
    if ($now - $last_check < 86400) {
        return [
            'tier'    => get_option('contentai_license_tier', 'free'),
            'valid'   => get_option('contentai_license_status', '') === 'active',
            'expires' => get_option('contentai_license_expires', null),
            'message' => '',
        ];
    }

    // Time to re-verify
    $result = contentai_verify_license($key, $site_url);
    contentai_save_license_result($key, $result);
    return $result;
}

function contentai_save_license_result($key, $result) {
    update_option('contentai_license_key', $key);
    update_option('contentai_license_tier', $result['tier'] ?? 'free');
    update_option('contentai_license_status', $result['valid'] ? 'active' : 'invalid');
    update_option('contentai_license_expires', $result['expires'] ?? null);
    update_option('contentai_license_last_check', time());
}

function contentai_get_used_count($user_id) {
    $option_key = "contentai_used_{$user_id}_" . date('Y_m');
    return (int) get_option($option_key, 0);
}

function contentai_increment_usage($user_id) {
    $option_key = "contentai_used_{$user_id}_" . date('Y_m');
    update_option($option_key, (int) get_option($option_key, 0) + 1);
}

function contentai_prepare_schedule_dates($date_gmt) {
    try {
        $date_utc = new DateTime($date_gmt, new DateTimeZone('UTC'));
        $date_local = clone $date_utc;
        $date_local->setTimezone(wp_timezone());
    } catch (Exception $e) {
        return new WP_Error('rest_invalid_date', 'Định dạng ngày không hợp lệ.', ['status' => 400]);
    }

    return [
        'post_date' => $date_local->format('Y-m-d H:i:s'),
        'post_date_gmt' => $date_utc->format('Y-m-d H:i:s'),
    ];
}

function contentai_prepare_schedule_dates_from_local($date_local) {
    $date_local = trim((string) $date_local);
    if ($date_local === '') {
        return new WP_Error('rest_invalid_date', 'Định dạng ngày không hợp lệ.', ['status' => 400]);
    }

    try {
        $local = new DateTime($date_local, wp_timezone());
        $utc = clone $local;
        $utc->setTimezone(new DateTimeZone('UTC'));
    } catch (Exception $e) {
        return new WP_Error('rest_invalid_date', 'Định dạng ngày không hợp lệ.', ['status' => 400]);
    }

    return [
        'post_date' => $local->format('Y-m-d H:i:s'),
        'post_date_gmt' => $utc->format('Y-m-d H:i:s'),
    ];
}

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

// ============================================================
// CUSTOM REST API — Hoạt động với mọi permalink setting (kể cả "Mặc định")
// ============================================================

add_action('rest_api_init', function () {
    $authenticate = function ($request) {
        $user_id = get_current_user_id();
        if ($user_id === 0) {
            return new WP_Error('rest_not_logged_in', 'Bạn cần đăng nhập.', ['status' => 401]);
        }
        if (!contentai_user_can_edit_posts()) {
            return new WP_Error('rest_forbidden', 'Bạn không có quyền dùng ContentAI.', ['status' => 403]);
        }
        return $user_id;
    };

    // GET /wp-json/contentai/v1/categories
    register_rest_route('contentai/v1', '/categories', [
        'methods'  => 'GET',
        'callback' => function ($request) use ($authenticate) {
            $user_id = $authenticate($request);
            if (is_wp_error($user_id)) return $user_id;

            $cats = get_categories(['hide_empty' => false]);
            return array_values(array_map(fn($c) => [
                'id'   => $c->term_id,
                'name' => $c->name,
                'slug' => $c->slug,
            ], array_filter($cats, fn($c) => $c->term_id !== 1)));
        },
        'permission_callback' => '__return_true',
    ]);

    // GET /wp-json/contentai/v1/posts?status=draft|publish|future&after=&before=
    register_rest_route('contentai/v1', '/posts', [
        'methods'  => 'GET',
        'callback' => function ($request) use ($authenticate) {
            $user_id = $authenticate($request);
            if (is_wp_error($user_id)) return $user_id;

            $status       = $request->get_param('status') ?: 'draft';
            $after        = $request->get_param('after');
            $before       = $request->get_param('before');
            $after_local  = $request->get_param('after_local');
            $before_local = $request->get_param('before_local');

            $posts = get_posts(contentai_build_posts_query_args($status, $after, $before, $after_local, $before_local));
            return array_values(array_map(fn($p) => [
                'id'           => $p->ID,
                'title'        => get_the_title($p),
                'content'      => $p->post_content,
                'status'       => $p->post_status,
                'date'         => $p->post_date,
                'modified'     => $p->post_modified,
                'categories'   => get_the_category($p->ID),
                'link'         => get_permalink($p),
                'thumbnail'    => get_the_post_thumbnail_url($p, 'thumbnail'),
            ], $posts));
        },
        'permission_callback' => 'contentai_user_can_edit_posts',
    ]);

    // POST /wp-json/contentai/v1/posts — Tạo draft mới
    register_rest_route('contentai/v1', '/posts', [
        'methods'  => 'POST',
        'callback' => function ($request) use ($authenticate) {
            $user_id = $authenticate($request);
            if (is_wp_error($user_id)) return $user_id;

            $title   = sanitize_text_field($request->get_param('title') ?: 'Untitled');
            $content = wp_kses_post($request->get_param('content') ?: '');
            $cats    = $request->get_param('categories') ?: [];

            $post_id = wp_insert_post([
                'post_type'    => 'post',
                'post_status'  => 'draft',
                'post_title'   => $title,
                'post_content' => $content,
                'post_author'  => $user_id,
            ]);

            if (is_wp_error($post_id)) return $post_id;

            if (!empty($cats)) {
                wp_set_post_categories($post_id, array_map('intval', $cats));
            }

            return ['id' => $post_id, 'link' => get_permalink($post_id)];
        },
        'permission_callback' => 'contentai_user_can_edit_posts',
    ]);

    // POST /wp-json/contentai/v1/schedule — Lên lịch bài viết
    register_rest_route('contentai/v1', '/schedule', [
        'methods'  => 'POST',
        'callback' => function ($request) use ($authenticate) {
            $user_id = $authenticate($request);
            if (is_wp_error($user_id)) return $user_id;

            $post_id    = (int) $request->get_param('post_id');
            $date_gmt   = sanitize_text_field($request->get_param('date_gmt'));
            $date_local = sanitize_text_field($request->get_param('date_local'));

            if (!$post_id || !get_post($post_id)) {
                return new WP_Error('rest_invalid_post', 'Bài viết không tồn tại.', ['status' => 404]);
            }
            if (!current_user_can('edit_post', $post_id)) {
                return new WP_Error('rest_forbidden', 'Bạn không có quyền lên lịch bài viết này.', ['status' => 403]);
            }

            $schedule = $date_local !== ''
                ? contentai_prepare_schedule_dates_from_local($date_local)
                : contentai_prepare_schedule_dates($date_gmt);
            if (is_wp_error($schedule)) {
                return $schedule;
            }

            $result = wp_update_post([
                'ID'            => $post_id,
                'post_status'   => 'future',
                'post_date'     => $schedule['post_date'],
                'post_date_gmt' => $schedule['post_date_gmt'],
                'edit_date'     => true,
            ]);

            if (is_wp_error($result)) return $result;
            return ['success' => true, 'post_id' => $post_id, 'scheduled_date' => $date_local ?: $date_gmt];
        },
        'permission_callback' => 'contentai_user_can_edit_posts',
    ]);
});

// AJAX fallback — dùng khi REST API bị block
add_action('wp_ajax_contentai_api', function () {
    check_ajax_referer('wp_rest');
    $user_id = get_current_user_id();
    if ($user_id === 0) {
        wp_send_json_error(['message' => 'Bạn cần đăng nhập.'], 401);
    }
    if (!contentai_user_can_edit_posts()) {
        wp_send_json_error(['message' => 'Bạn không có quyền dùng ContentAI.'], 403);
    }

    // New format: _path=contentai/v1/posts&status=draft&after=... (separate params)
    // Old format fallback: endpoint=contentai/v1/posts?status=draft
    $path = isset($_REQUEST['_path']) ? sanitize_text_field($_REQUEST['_path']) : '';
    if (empty($path)) {
        // Fallback to old endpoint param
        $raw = isset($_REQUEST['endpoint']) ? sanitize_text_field($_REQUEST['endpoint']) : '';
        $raw = preg_replace('#^contentai/v1/#', '', $raw);
        $qpos = strpos($raw, '?');
        if ($qpos !== false) {
            $path = substr($raw, 0, $qpos);
            parse_str(substr($raw, $qpos + 1), $_REQUEST);
        } else {
            $path = $raw;
        }
    } else {
        $path = preg_replace('#^contentai/v1/#', '', $path);
    }

    $method = $_SERVER['REQUEST_METHOD'];
    error_log('[ContentAI AJAX] path=' . $path . ' status=' . ($_REQUEST['status'] ?? 'none') . ' after=' . ($_REQUEST['after'] ?? 'none'));

    switch ($path) {
        case 'categories':
            $cats = get_categories(['hide_empty' => false]);
            $result = array_values(array_map(fn($c) => [
                'id' => $c->term_id, 'name' => $c->name, 'slug' => $c->slug,
            ], array_filter($cats, fn($c) => $c->term_id !== 1)));
            error_log('[ContentAI AJAX] categories result count=' . count($result));
            wp_send_json($result);
            break;

        case 'posts': {
            $status       = sanitize_text_field($_REQUEST['status'] ?? 'draft');
            $after        = sanitize_text_field($_REQUEST['after'] ?? '');
            $before       = sanitize_text_field($_REQUEST['before'] ?? '');
            $after_local  = sanitize_text_field($_REQUEST['after_local'] ?? '');
            $before_local = sanitize_text_field($_REQUEST['before_local'] ?? '');
            $posts = get_posts(contentai_build_posts_query_args($status, $after, $before, $after_local, $before_local));
            $result = array_values(array_map(fn($p) => [
                'id' => $p->ID, 'title' => get_the_title($p), 'content' => $p->post_content,
                'status' => $p->post_status, 'date' => $p->post_date,
                'categories' => get_the_category($p->ID),
            ], $posts));
            error_log('[ContentAI AJAX] posts result count=' . count($result) . ' status=' . $status);
            wp_send_json($result);
            break;
        }

        default:
            error_log('[ContentAI AJAX] unknown endpoint: ' . ($path ?: 'empty'));
            wp_send_json_error(['message' => 'Unknown endpoint: ' . $path], 400);
    }
});

// AJAX: /admin-ajax.php?action=contentai_schedule
add_action('wp_ajax_contentai_schedule', function () {
    check_ajax_referer('wp_rest');
    $user_id = get_current_user_id();
    if ($user_id === 0) {
        wp_send_json_error(['message' => 'Bạn cần đăng nhập.'], 401);
    }
    if (!contentai_user_can_edit_posts()) {
        wp_send_json_error(['message' => 'Bạn không có quyền dùng ContentAI.'], 403);
    }

    $post_id    = (int) ($_POST['post_id'] ?? 0);
    $date_gmt   = sanitize_text_field($_POST['date_gmt'] ?? '');
    $date_local = sanitize_text_field($_POST['date_local'] ?? '');

    if (!$post_id || !get_post($post_id)) {
        wp_send_json_error(['message' => 'Bài viết không tồn tại.'], 404);
    }
    if (!current_user_can('edit_post', $post_id)) {
        wp_send_json_error(['message' => 'Bạn không có quyền lên lịch bài viết này.'], 403);
    }

    $schedule = $date_local !== ''
        ? contentai_prepare_schedule_dates_from_local($date_local)
        : contentai_prepare_schedule_dates($date_gmt);
    if (is_wp_error($schedule)) {
        wp_send_json_error(['message' => 'Định dạng ngày không hợp lệ.'], 400);
    }

    $result = wp_update_post([
        'ID'            => $post_id,
        'post_status'   => 'future',
        'post_date'     => $schedule['post_date'],
        'post_date_gmt' => $schedule['post_date_gmt'],
        'edit_date'     => true,
    ]);

    if (is_wp_error($result)) {
        wp_send_json_error(['message' => $result->get_error_message()], 500);
    }
    wp_send_json_success(['post_id' => $post_id, 'scheduled_date' => $date_local ?: $date_gmt]);
});

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
    add_submenu_page('contentai', 'Lịch nội dung', 'Lịch nội dung', 'edit_posts', 'contentai-calendar', 'contentai_calendar_page');
    add_submenu_page('contentai', 'Cài đặt', 'Cài đặt', 'manage_options', 'contentai-settings', 'contentai_settings_page');
});

add_action('admin_init', function () {
    if (!is_admin() || !current_user_can('edit_posts')) {
        return;
    }

    $page = sanitize_key($_GET['page'] ?? '');
    if ($page === 'contentai-write') {
        wp_safe_redirect(admin_url('post-new.php'));
        exit;
    }

    if ($page === 'contentai-history') {
        wp_safe_redirect(admin_url('admin.php?page=contentai'));
        exit;
    }
});

function contentai_dashboard_page() {
    $usage    = contentai_get_usage_info(home_url());
    $used     = $usage['count'];
    $limit    = $usage['limit'];
    $license  = contentai_check_license_status();
    $is_pro   = ($license['tier'] ?? 'free') === 'pro' && ($license['valid'] ?? false);
    $usage_available = !empty($usage['available']);
    ?>
    <div class="wrap">
        <h1>ContentAI — Dashboard</h1>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:20px; max-width:800px;">
            <div style="background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:20px;">
                <div style="font-size:28px; font-weight:700; color:#2563eb;"><?php echo esc_html($usage_available ? "{$used}/{$limit}" : '--'); ?></div>
                <div style="font-size:13px; color:#888; margin-top:4px;"><?php echo esc_html($usage_available ? 'Bài đã dùng tháng này' : 'Chưa đọc được quota từ API'); ?></div>
            </div>
            <div style="background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:20px;">
                <div style="font-size:28px; font-weight:700; color:<?php echo $is_pro ? '#9333ea' : '#16a34a'; ?>;"><?php echo $is_pro ? 'Pro' : 'Free'; ?></div>
                <div style="font-size:13px; color:#888; margin-top:4px;">Gói hiện tại</div>
            </div>
            <div style="background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:20px;">
                <div style="font-size:28px; font-weight:700; color:#d97706;">SEO</div>
                <div style="font-size:13px; color:#888; margin-top:4px;">Realtime analyzer</div>
            </div>
        </div>
        <?php if (!$is_pro): ?>
        <div style="margin-top:20px; padding:16px; background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; max-width:800px;">
            <strong>Bạn đang dùng gói Free</strong> — <?php echo esc_html($limit); ?> bài/tháng.
            <a href="<?php echo admin_url('admin.php?page=contentai-settings'); ?>">Nâng cấp Pro</a> để không giới hạn.
        </div>
        <?php endif; ?>
        <?php if (!$usage_available): ?>
        <div style="margin-top:12px; padding:12px 16px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; max-width:800px;">
            Không đồng bộ được usage từ API. Dashboard có thể hiển thị lệch quota cho đến khi backend hoạt động lại.
        </div>
        <?php endif; ?>
        <div style="margin-top:24px;">
            <h3>Bắt đầu nhanh</h3>
            <p>Mở <strong>Gutenberg Editor</strong> (tạo/sửa bài viết) → sidebar ContentAI tự động hiện ra.</p>
            <a href="<?php echo admin_url('post-new.php'); ?>" class="button button-primary button-hero">Viết bài mới với AI</a>
        </div>
    </div>
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

function contentai_settings_page() {
    $license = contentai_check_license_status();
    $is_pro  = ($license['tier'] ?? 'free') === 'pro' && ($license['valid'] ?? false);
    $key     = get_option('contentai_license_key', '');
    $error   = isset($_GET['license_error']) ? urldecode($_GET['license_error']) : '';
    $success = isset($_GET['license_success']) ? true : false;

    // Handle form submission
    if (isset($_POST['contentai_license_nonce']) && wp_verify_nonce($_POST['contentai_license_nonce'], 'contentai_license_action')) {
        $new_key = sanitize_text_field($_POST['contentai_license_key'] ?? '');
        if (!empty($new_key)) {
            $result = contentai_verify_license($new_key, home_url());
            contentai_save_license_result($new_key, $result);
            // Refresh values after save
            $key = get_option('contentai_license_key', '');
            $license = contentai_check_license_status();
            $is_pro = ($license['tier'] ?? 'free') === 'pro' && ($license['valid'] ?? false);
            if ($result['valid']) {
                $success = true;
                $error = '';
            } else {
                $success = false;
                $error = $result['message'] ?: 'License key không hợp lệ.';
            }
        } else {
            // Clear license
            delete_option('contentai_license_key');
            delete_option('contentai_license_tier');
            delete_option('contentai_license_status');
            delete_option('contentai_license_expires');
            delete_option('contentai_license_last_check');
            $key = '';
            $is_pro = false;
            $success = false;
            $error = '';
        }
    }

    $redirect_url = admin_url('admin.php?page=contentai-settings');
    if ($success) {
        echo '<script>window.location.href = ' . json_encode($redirect_url . '&license_success=1') . ';</script>';
        echo '<div class="notice notice-success"><p>License key đã được kích hoạt thành công! Trang sẽ được tải lại...</p></div>';
    }
    ?>
    <div class="wrap">
        <h1>Cài đặt ContentAI</h1>

        <?php if ($error): ?>
            <div class="notice notice-error"><p><?php echo esc_html($error); ?></p></div>
        <?php endif; ?>
        <?php if ($success && !isset($_GET['license_success'])): ?>
            <div class="notice notice-success"><p>License key đã được kích hoạt thành công!</p></div>
        <?php endif; ?>

        <form method="post" action="<?php echo esc_url($redirect_url); ?>" style="max-width:600px; margin-top:20px;">
            <?php wp_nonce_field('contentai_license_action', 'contentai_license_nonce'); ?>
            <h2>License Key</h2>
            <table class="form-table">
                <tr>
                    <th scope="row">Trạng thái</th>
                    <td>
                        <?php if ($is_pro): ?>
                            <span style="background:#16a34a; color:#fff; padding:3px 12px; border-radius:12px; font-weight:600;">Pro</span>
                            <?php if (!empty($license['expires'])): ?>
                                <span style="color:#888; font-size:12px;"> — Hết hạn: <?php echo esc_html(date('d/m/Y', (int)$license['expires'] / 1000)); ?></span>
                            <?php endif; ?>
                        <?php else: ?>
                            <span style="background:#e0e0e0; color:#555; padding:3px 12px; border-radius:12px; font-weight:600;">Free</span>
                            <span style="color:#888; font-size:12px;"> — <?php echo CONTENTAI_FREE_LIMIT; ?> bài/tháng</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <th scope="row">License Key</th>
                    <td>
                        <?php if (!empty($key)): ?>
                            <code style="font-size:11px; background:#f0f0f0; padding:4px 8px; border-radius:4px; display:block; margin-bottom:8px;"><?php echo esc_html($key); ?></code>
                            <p class="description" style="margin-bottom:8px;">Đã đăng ký. Key sẽ tự động xác minh lại mỗi 24h.</p>
                        <?php endif; ?>
                        <input type="text" name="contentai_license_key" class="regular-text" value="<?php echo esc_attr($key); ?>" placeholder="Nhập license key (VD: DEMO-PRO-XXXX)" style="max-width:400px;" />
                        <p class="description">Nhận license key tại <a href="https://contentai.vn" target="_blank">contentai.vn</a></p>
                    </td>
                </tr>
            </table>
            <p class="submit">
                <button type="submit" class="button button-primary">Kích hoạt / Cập nhật License</button>
                <?php if (!empty($key)): ?>
                    <span style="margin-left:8px; color:#666; font-size:12px; vertical-align:middle;">hoặc</span>
                    <button type="submit" name="contentai_license_key" value="" class="button" style="margin-left:4px;" onclick="return confirm('Bạn có chắc muốn xóa license key?');">Xóa License</button>
                <?php endif; ?>
            </p>
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
    wp_register_style('contentai-editor-inline', false, [], filemtime($dist_path . 'editor.js'));
    wp_enqueue_style('contentai-editor-inline');
    wp_add_inline_style('contentai-editor-inline', contentai_get_layout_css());

    // Inject data cho React (window.contentaiData)
    $user_id  = get_current_user_id();
    $token    = contentai_generate_jwt($user_id);
    $license  = contentai_check_license_status();
    $usage    = contentai_get_usage_info(home_url());
    $is_pro  = ($license['tier'] ?? 'free') === 'pro' && ($license['valid'] ?? false);

    wp_localize_script('contentai-editor', 'contentaiData', [
        'apiUrl'      => CONTENTAI_API_URL,
        'token'       => $token,
        'userId'      => $user_id,
        'usedCount'   => $usage['count'],
        'freeLimit'   => $usage['limit'],
        'usageAvailable' => !empty($usage['available']),
        'usageMessage' => $usage['message'] ?? '',
        'isPro'       => $is_pro,
        'siteUrl'     => home_url(),
        'licenseTier' => $license['tier'] ?? 'free',
        'licenseKey'  => get_option('contentai_license_key', ''),
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
    if ($handle === 'contentai-editor' || $handle === 'contentai-calendar') {
        $tag = str_replace(' src=', ' type="module" src=', $tag);
    }
    return $tag;
}, 10, 2);
