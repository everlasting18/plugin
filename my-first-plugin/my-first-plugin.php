<?php
/**
 * Plugin Name: My First Plugin
 * Description: Plugin demo để hiểu WordPress
 * Version: 1.0
 * Author: Phat
 */

// Hook khi WordPress khởi động
add_action('init', function () {
    // log ra để debug
    error_log("Plugin đã chạy INIT");
});

// Thêm menu vào admin
add_action('admin_menu', function () {
    add_menu_page(
        'My Plugin',        // title
        'My Plugins',        // menu name
        'manage_options',   // quyền
        'my-plugin',        // slug
        'my_plugin_page'    // callback
    );
});

// Nội dung trang admin
function my_plugin_page() {
    echo "<h1>Hello từ plugin 😎</h1>";

    // xử lý form
    if (isset($_POST['my_input'])) {
        echo "<p>Bạn nhập: " . esc_html($_POST['my_input']) . "</p>";
    }

    echo '
    <form method="POST">
        <input name="my_input" placeholder="Nhập gì đó..." />
        <button type="submit">Gửi</button>
    </form>
    ';
}