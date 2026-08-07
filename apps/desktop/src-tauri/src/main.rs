// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 获取主窗口
            let window = app.get_webview_window("main").unwrap();
            
            // Windows 系统开启 Mica 毛玻璃效果
            #[cfg(target_os = "windows")]
            {
                use window_vibrancy::apply_mica;
                apply_mica(&window, None).unwrap();
            }

            // macOS 开启 vibrancy 毛玻璃效果
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::apply_vibrancy;
                use window_vibrancy::NSVisualEffectMaterial::HudWindow;
                apply_vibrancy(&window, HudWindow, None, None).unwrap();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
