// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WindowEvent};

#[derive(Clone, Copy)]
enum HorizontalPlacement {
    Left,
    Right,
}

#[derive(Clone, Copy)]
enum VerticalPlacement {
    Top,
    Bottom,
}

#[derive(Clone, Copy)]
struct PetPlacement {
    horizontal: HorizontalPlacement,
    vertical: VerticalPlacement,
}

impl PetPlacement {
    fn label(self) -> &'static str {
        match (self.vertical, self.horizontal) {
            (VerticalPlacement::Top, HorizontalPlacement::Left) => "top-left",
            (VerticalPlacement::Top, HorizontalPlacement::Right) => "top-right",
            (VerticalPlacement::Bottom, HorizontalPlacement::Left) => "bottom-left",
            (VerticalPlacement::Bottom, HorizontalPlacement::Right) => "bottom-right",
        }
    }
}

struct PetLayoutState {
    placement: PetPlacement,
    anchor: Option<PhysicalPosition<i32>>,
}

static PET_LAYOUT: Mutex<PetLayoutState> = Mutex::new(PetLayoutState {
    placement: PetPlacement {
        horizontal: HorizontalPlacement::Right,
        vertical: VerticalPlacement::Bottom,
    },
    anchor: None,
});

fn detect_pet_placement(
    pet: &tauri::WebviewWindow,
    position: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
) -> PetPlacement {
    let Ok(Some(monitor)) = pet.current_monitor() else {
        return PetPlacement {
            horizontal: HorizontalPlacement::Right,
            vertical: VerticalPlacement::Bottom,
        };
    };
    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let center_x = position.x + size.width as i32 / 2;
    let center_y = position.y + size.height as i32 / 2;
    let monitor_center_x = monitor_position.x + monitor_size.width as i32 / 2;
    let monitor_center_y = monitor_position.y + monitor_size.height as i32 / 2;

    PetPlacement {
        horizontal: if center_x < monitor_center_x {
            HorizontalPlacement::Left
        } else {
            HorizontalPlacement::Right
        },
        vertical: if center_y < monitor_center_y {
            VerticalPlacement::Top
        } else {
            VerticalPlacement::Bottom
        },
    }
}

fn apply_pet_size(
    pet: &tauri::WebviewWindow,
    expanded: bool,
    results: bool,
) -> Result<PetPlacement, String> {
    let old_size = pet.outer_size().map_err(|error| error.to_string())?;
    let old_position = pet.outer_position().map_err(|error| error.to_string())?;
    let was_expanded = old_size.width > 220 || old_size.height > 220;
    let (width, height) = match (expanded, results) {
        (false, _) => (160, 120),
        (true, false) => (560, 180),
        (true, true) => (560, 520),
    };

    let (placement, anchor) = {
        let mut layout = PET_LAYOUT.lock().map_err(|error| error.to_string())?;
        if !was_expanded {
            layout.placement = detect_pet_placement(pet, old_position, old_size);
            layout.anchor = Some(old_position);
        }
        (layout.placement, layout.anchor.unwrap_or(old_position))
    };

    let x = match placement.horizontal {
        HorizontalPlacement::Left => anchor.x,
        HorizontalPlacement::Right => anchor.x + 160 - width as i32,
    };
    let y = match placement.vertical {
        VerticalPlacement::Top => anchor.y,
        VerticalPlacement::Bottom => anchor.y + 120 - height as i32,
    };

    pet.set_size(PhysicalSize::new(width, height))
        .map_err(|error| error.to_string())?;
    pet.set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())?;
    let _ = pet.eval(&format!(
        "window.dispatchEvent(new CustomEvent('flexikit-pet-placement', {{ detail: '{}' }}))",
        placement.label()
    ));
    Ok(placement)
}

#[cfg(target_os = "windows")]
mod native_pet_pointer {
    use super::{apply_pet_size, HorizontalPlacement, VerticalPlacement, PET_LAYOUT};
    use std::{
        thread,
        time::{Duration, Instant},
    };
    use tauri::{AppHandle, Manager};

    #[derive(Clone, Copy)]
    #[repr(C)]
    struct Point {
        x: i32,
        y: i32,
    }

    #[link(name = "user32")]
    extern "system" {
        fn GetCursorPos(point: *mut Point) -> i32;
        fn GetAsyncKeyState(key: i32) -> i16;
    }

    const VK_LBUTTON: i32 = 0x01;
    const VK_RBUTTON: i32 = 0x02;

    fn key_down(key: i32) -> bool {
        unsafe { (GetAsyncKeyState(key) as u16 & 0x8000) != 0 }
    }

    pub fn spawn(app: AppHandle) {
        thread::spawn(move || {
            let mut outside_since: Option<Instant> = None;
            let mut left_was_down = false;
            let mut right_was_down = false;
            let mut was_inside = false;
            let mut last_click_at: Option<Instant> = None;
            let mut drag_origin: Option<(
                Point,
                tauri::PhysicalPosition<i32>,
                Option<tauri::PhysicalPosition<i32>>,
            )> = None;
            let mut dragging = false;

            loop {
                let Some(pet) = app.get_webview_window("pet") else {
                    break;
                };
                let Ok(position) = pet.outer_position() else {
                    thread::sleep(Duration::from_millis(80));
                    continue;
                };
                let Ok(size) = pet.outer_size() else {
                    thread::sleep(Duration::from_millis(80));
                    continue;
                };
                let expanded = size.width > 220;

                let mut cursor = Point { x: 0, y: 0 };
                let cursor_ok = unsafe { GetCursorPos(&mut cursor) } != 0;
                let inside = cursor_ok
                    && cursor.x >= position.x
                    && cursor.x < position.x + size.width as i32
                    && cursor.y >= position.y
                    && cursor.y < position.y + size.height as i32;
                let left_down = key_down(VK_LBUTTON);
                let right_down = key_down(VK_RBUTTON);

                if left_down && !left_was_down && inside {
                    let placement = PET_LAYOUT.lock().ok().map(|layout| layout.placement);
                    let pet_hit = !expanded
                        || placement
                            .map(
                                |placement| match (placement.vertical, placement.horizontal) {
                                    (VerticalPlacement::Top, HorizontalPlacement::Left) => {
                                        cursor.x < position.x + 90 && cursor.y < position.y + 90
                                    }
                                    (VerticalPlacement::Top, HorizontalPlacement::Right) => {
                                        cursor.x >= position.x + size.width as i32 - 90
                                            && cursor.y < position.y + 90
                                    }
                                    (VerticalPlacement::Bottom, HorizontalPlacement::Left) => {
                                        cursor.x < position.x + 90
                                            && cursor.y >= position.y + size.height as i32 - 90
                                    }
                                    (VerticalPlacement::Bottom, HorizontalPlacement::Right) => {
                                        cursor.x >= position.x + size.width as i32 - 90
                                            && cursor.y >= position.y + size.height as i32 - 90
                                    }
                                },
                            )
                            .unwrap_or(cursor.x < position.x + 90);
                    if pet_hit {
                        let anchor = PET_LAYOUT.lock().ok().and_then(|layout| layout.anchor);
                        drag_origin = Some((cursor, position, anchor));
                    }
                }

                if left_down {
                    if let Some((start_cursor, start_position, start_anchor)) = drag_origin {
                        let delta_x = cursor.x - start_cursor.x;
                        let delta_y = cursor.y - start_cursor.y;
                        if !dragging && delta_x * delta_x + delta_y * delta_y >= 36 {
                            dragging = true;
                            last_click_at = None;
                            let _ = pet.eval(
                                "window.dispatchEvent(new CustomEvent('flexikit-pet-drag-start'))",
                            );
                        }
                        if dragging {
                            let _ = pet.set_position(tauri::PhysicalPosition::new(
                                start_position.x + delta_x,
                                start_position.y + delta_y,
                            ));
                            if let Some(anchor) = start_anchor {
                                if let Ok(mut layout) = PET_LAYOUT.lock() {
                                    layout.anchor = Some(tauri::PhysicalPosition::new(
                                        anchor.x + delta_x,
                                        anchor.y + delta_y,
                                    ));
                                }
                            }
                        }
                    }
                }

                if !left_down && left_was_down {
                    if drag_origin.take().is_some() {
                        if dragging {
                            let _ = pet.eval(
                                "window.dispatchEvent(new CustomEvent('flexikit-pet-drag-end'))",
                            );
                        } else if inside {
                            let now = Instant::now();
                            let is_double_click = last_click_at
                                .map(|last| now.duration_since(last) <= Duration::from_millis(360))
                                .unwrap_or(false);
                            let event_name = if is_double_click {
                                last_click_at = None;
                                "flexikit-pet-native-double-click"
                            } else {
                                last_click_at = Some(now);
                                "flexikit-pet-native-click"
                            };
                            let _ = pet.eval(&format!(
                                "window.dispatchEvent(new CustomEvent('{event_name}'))"
                            ));
                        }
                    }
                    dragging = false;
                }

                if inside {
                    outside_since = None;
                    if !was_inside {
                        let _ = pet.eval(
                            "window.dispatchEvent(new CustomEvent('flexikit-pet-hover-enter'))",
                        );
                    }

                    if right_down && !right_was_down {
                        if !expanded {
                            let _ = apply_pet_size(&pet, true, true);
                        }
                        let _ = pet.set_focus();
                        let _ = pet.eval(
                            "window.dispatchEvent(new CustomEvent('flexikit-pet-native-menu'))",
                        );
                    }
                } else {
                    if left_down && !left_was_down && expanded && !dragging {
                        if apply_pet_size(&pet, false, false).is_ok() {
                            outside_since = None;
                            let _ = pet.eval("window.dispatchEvent(new CustomEvent('flexikit-pet-native-collapse'))");
                        }
                    }
                    if was_inside {
                        let _ = pet.eval(
                            "window.dispatchEvent(new CustomEvent('flexikit-pet-hover-leave'))",
                        );
                    }
                    let focused = pet.is_focused().unwrap_or(false);
                    if expanded && !focused && !dragging {
                        let left_at = outside_since.get_or_insert_with(Instant::now);
                        if left_at.elapsed() >= Duration::from_millis(900) {
                            if apply_pet_size(&pet, false, false).is_ok() {
                                outside_since = None;
                                let _ = pet.eval("window.dispatchEvent(new CustomEvent('flexikit-pet-native-collapse'))");
                            }
                        }
                    }
                }

                left_was_down = left_down;
                right_was_down = right_down;
                was_inside = inside;
                thread::sleep(Duration::from_millis(60));
            }
        });
    }
}

fn main_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window("main")
        .ok_or_else(|| "main window is unavailable".to_string())
}

#[tauri::command]
fn show_main_window(app: AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    window.show().map_err(|error| error.to_string())?;
    window.unminimize().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn minimize_main_window(app: AppHandle) -> Result<(), String> {
    main_window(&app)?
        .minimize()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn toggle_maximize_main_window(app: AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    if window.is_maximized().map_err(|error| error.to_string())? {
        window.unmaximize().map_err(|error| error.to_string())
    } else {
        window.maximize().map_err(|error| error.to_string())
    }
}

#[tauri::command]
fn hide_main_window(app: AppHandle) -> Result<(), String> {
    main_window(&app)?.hide().map_err(|error| error.to_string())
}

#[tauri::command]
fn resize_pet_window(
    app: AppHandle,
    expanded: bool,
    results: Option<bool>,
) -> Result<String, String> {
    let pet = app
        .get_webview_window("pet")
        .ok_or_else(|| "pet window is unavailable".to_string())?;
    apply_pet_size(&pet, expanded, results.unwrap_or(false))
        .map(|placement| placement.label().to_string())
}

#[tauri::command]
fn mark_pet_ready(app: AppHandle) -> Result<(), String> {
    app.get_webview_window("pet")
        .ok_or_else(|| "pet window is unavailable".to_string())?
        .set_title("FlexiKit Pet Ready")
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            show_main_window,
            minimize_main_window,
            toggle_maximize_main_window,
            hide_main_window,
            resize_pet_window,
            mark_pet_ready,
            quit_app
        ])
        .setup(|app| {
            if let Some(main) = app.get_webview_window("main") {
                let main_for_close = main.clone();
                main.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = main_for_close.hide();
                    }
                });
            }

            if let Some(pet) = app.get_webview_window("pet") {
                let _ = pet.set_size(PhysicalSize::new(160, 120));
                if let Ok(Some(monitor)) = pet.primary_monitor() {
                    let monitor_size = monitor.size();
                    let monitor_position = monitor.position();
                    let x = monitor_position.x + monitor_size.width as i32 - 200;
                    let y = monitor_position.y + monitor_size.height as i32 - 200;
                    let _ = pet.set_position(PhysicalPosition::new(x, y));
                }
            }

            #[cfg(target_os = "windows")]
            native_pet_pointer::spawn(app.handle().clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running FlexiKit desktop");
}
