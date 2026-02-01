// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

mod commands;
mod pty;

fn main() {
    // 创建系统托盘菜单
    let tray_menu = SystemTrayMenu::new()
        .add_item(SystemTrayMenuItem::new("显示", "show"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(SystemTrayMenuItem::new("退出", "quit"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::minimize_window,
            commands::maximize_window,
            commands::close_window,
            pty::create_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::destroy_pty,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
