/**
 * Tauri Commands
 * 
 * 前端可调用的 Rust 命令
 */

use tauri::Manager;

/// 问候命令
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 最小化窗口
#[tauri::command]
pub fn minimize_window(window: tauri::Window) {
    window.minimize().unwrap();
}

/// 最大化窗口
#[tauri::command]
pub fn maximize_window(window: tauri::Window) {
    if window.is_maximized().unwrap() {
        window.unmaximize().unwrap();
    } else {
        window.maximize().unwrap();
    }
}

/// 关闭窗口
#[tauri::command]
pub fn close_window(window: tauri::Window) {
    window.close().unwrap();
}
