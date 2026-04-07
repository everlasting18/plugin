<?php
/**
 * Plugin Name: CSS Module React
 * Description: WordPress plugin sử dụng React + CSS Modules để tránh xung đột class name
 * Version: 1.0
 * Author: Phat
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CMR_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CMR_PLUGIN_PATH', plugin_dir_path(__FILE__));

// Load tất cả CSS files trong dist/ (bao gồm shared component CSS)
function cmr_enqueue_all_css($prefix) {
    $dist_path = CMR_PLUGIN_PATH . 'dist/';
    $dist_url = CMR_PLUGIN_URL . 'dist/';
    $css_files = glob($dist_path . '*.css');

    if ($css_files) {
        foreach ($css_files as $css_file) {
            $filename = basename($css_file, '.css');
            wp_enqueue_style(
                "cmr-{$prefix}-{$filename}",
                $dist_url . basename($css_file),
                [],
                filemtime($css_file)
            );
        }
    }
}

// Thêm type="module" cho script của plugin (vì Vite output ES modules)
add_filter('script_loader_tag', function ($tag, $handle) {
    if (in_array($handle, ['cmr-admin-js', 'cmr-frontend-js'])) {
        $tag = str_replace(' src=', ' type="module" src=', $tag);
    }
    return $tag;
}, 10, 2);

// === ADMIN ===

add_action('admin_menu', function () {
    add_menu_page(
        'CSS Module React',
        'CSS Module React',
        'manage_options',
        'css-module-react',
        'cmr_admin_page',
        'dashicons-layout',
        30
    );
});

function cmr_admin_page() {
    echo '<div class="wrap"><div id="css-module-react-admin"></div></div>';
}

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_css-module-react') {
        return;
    }

    $dist_path = CMR_PLUGIN_PATH . 'dist/';
    $dist_url = CMR_PLUGIN_URL . 'dist/';

    if (file_exists($dist_path . 'admin.js')) {
        wp_enqueue_script(
            'cmr-admin-js',
            $dist_url . 'admin.js',
            [],
            filemtime($dist_path . 'admin.js'),
            true
        );
    }

    cmr_enqueue_all_css('admin');
});

// === FRONTEND (Shortcode) ===

add_shortcode('css_module_react', function () {
    static $enqueued = false;

    if (!$enqueued) {
        $dist_path = CMR_PLUGIN_PATH . 'dist/';
        $dist_url = CMR_PLUGIN_URL . 'dist/';

        if (file_exists($dist_path . 'frontend.js')) {
            wp_enqueue_script(
                'cmr-frontend-js',
                $dist_url . 'frontend.js',
                [],
                filemtime($dist_path . 'frontend.js'),
                true
            );
        }

        cmr_enqueue_all_css('frontend');
        $enqueued = true;
    }

    return '<div id="css-module-react-frontend"></div>';
});
