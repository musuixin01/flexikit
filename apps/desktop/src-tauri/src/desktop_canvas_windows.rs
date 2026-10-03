use std::{
    ffi::{c_void, OsStr},
    os::windows::ffi::OsStrExt,
    ptr,
    sync::{
        atomic::{AtomicBool, AtomicIsize, Ordering},
        Mutex,
    },
    thread,
    time::Duration,
};

use tauri::WebviewWindow;

type Hwnd = *mut c_void;

const WM_SPAWN_WORKER: u32 = 0x052C;
const SMTO_NORMAL: u32 = 0;
const GWL_STYLE: i32 = -16;
const WS_CHILD: isize = 0x4000_0000;
const WS_POPUP: isize = 0x8000_0000_u32 as isize;
const SWP_NOACTIVATE: u32 = 0x0010;
const SWP_FRAMECHANGED: u32 = 0x0020;
const HWND_TOP: isize = 0;
const HWND_BOTTOM: isize = 1;
const RGN_OR: i32 = 2;

#[repr(C)]
struct Rect {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
}

#[link(name = "user32")]
extern "system" {
    fn FindWindowW(class_name: *const u16, window_name: *const u16) -> Hwnd;
    fn FindWindowExW(
        parent: Hwnd,
        child_after: Hwnd,
        class_name: *const u16,
        window_name: *const u16,
    ) -> Hwnd;
    fn SendMessageTimeoutW(
        hwnd: Hwnd,
        message: u32,
        wparam: usize,
        lparam: isize,
        flags: u32,
        timeout: u32,
        result: *mut usize,
    ) -> usize;
    fn EnumWindows(callback: unsafe extern "system" fn(Hwnd, isize) -> i32, lparam: isize) -> i32;
    fn SetParent(child: Hwnd, new_parent: Hwnd) -> Hwnd;
    fn GetParent(hwnd: Hwnd) -> Hwnd;
    fn IsWindow(hwnd: Hwnd) -> i32;
    fn IsWindowVisible(hwnd: Hwnd) -> i32;
    fn GetClassNameW(hwnd: Hwnd, class_name: *mut u16, max_count: i32) -> i32;
    fn GetWindowLongPtrW(hwnd: Hwnd, index: i32) -> isize;
    fn SetWindowLongPtrW(hwnd: Hwnd, index: i32, value: isize) -> isize;
    fn GetClientRect(hwnd: Hwnd, rect: *mut Rect) -> i32;
    fn SetWindowPos(
        hwnd: Hwnd,
        insert_after: Hwnd,
        x: i32,
        y: i32,
        width: i32,
        height: i32,
        flags: u32,
    ) -> i32;
    fn SetWindowRgn(hwnd: Hwnd, region: Hwnd, redraw: i32) -> i32;
}

#[link(name = "gdi32")]
extern "system" {
    fn CreateRectRgn(left: i32, top: i32, right: i32, bottom: i32) -> Hwnd;
    fn CreateRoundRectRgn(
        left: i32,
        top: i32,
        right: i32,
        bottom: i32,
        width: i32,
        height: i32,
    ) -> Hwnd;
    fn CombineRgn(destination: Hwnd, source1: Hwnd, source2: Hwnd, mode: i32) -> i32;
    fn DeleteObject(object: Hwnd) -> i32;
}

struct PointerState {
    regions: Vec<[f64; 5]>,
    edit_mode: bool,
}

static POINTER_STATE: Mutex<PointerState> = Mutex::new(PointerState {
    regions: Vec::new(),
    edit_mode: false,
});

static ATTACH_LOCK: Mutex<()> = Mutex::new(());
static LAST_DESKTOP_PARENT: AtomicIsize = AtomicIsize::new(0);
static RECOVERY_MONITOR_STARTED: AtomicBool = AtomicBool::new(false);
static CANVAS_EXPECTED_VISIBLE: AtomicBool = AtomicBool::new(false);

fn wide(value: &str) -> Vec<u16> {
    OsStr::new(value).encode_wide().chain(Some(0)).collect()
}

fn window_class_name(hwnd: Hwnd) -> String {
    if hwnd.is_null() {
        return String::new();
    }
    let mut buffer = [0_u16; 128];
    let length = unsafe { GetClassNameW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32) };
    if length <= 0 {
        return String::new();
    }
    String::from_utf16_lossy(&buffer[..length as usize])
}

fn is_desktop_parent_window(hwnd: Hwnd) -> bool {
    matches!(window_class_name(hwnd).as_str(), "Progman" | "WorkerW")
}

fn canvas_insert_after(desktop_parent: Hwnd) -> Hwnd {
    if window_class_name(desktop_parent) == "Progman" {
        // Canvas must sit above SHELLDLL_DefView so its shaped interactive regions
        // receive real mouse input. Outside the HRGN the window does not exist for
        // hit testing, so desktop blank space still falls through to Explorer.
        return HWND_TOP as Hwnd;
    }
    HWND_BOTTOM as Hwnd
}

fn place_canvas_on_desktop_layer(hwnd: Hwnd, desktop_parent: Hwnd) -> Result<(), String> {
    let mut parent_rect = Rect {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    if unsafe { GetClientRect(desktop_parent, &mut parent_rect) } == 0 {
        return Err("failed to read Windows desktop bounds".to_string());
    }
    let width = parent_rect.right - parent_rect.left;
    let height = parent_rect.bottom - parent_rect.top;
    if unsafe {
        SetWindowPos(
            hwnd,
            canvas_insert_after(desktop_parent),
            0,
            0,
            width,
            height,
            SWP_NOACTIVATE | SWP_FRAMECHANGED,
        )
    } == 0
    {
        return Err("failed to place Desktop Canvas on the Windows desktop layer".to_string());
    }
    Ok(())
}

unsafe extern "system" fn find_worker_window(top: Hwnd, output: isize) -> i32 {
    let shell_view = wide("SHELLDLL_DefView");
    let def_view = FindWindowExW(top, ptr::null_mut(), shell_view.as_ptr(), ptr::null());
    if def_view.is_null() {
        return 1;
    }

    let worker_class = wide("WorkerW");
    let worker = FindWindowExW(ptr::null_mut(), top, worker_class.as_ptr(), ptr::null());
    if worker.is_null() {
        return 1;
    }

    let output = output as *mut Hwnd;
    if !output.is_null() {
        *output = worker;
    }
    0
}

fn desktop_parent_window() -> Result<Hwnd, String> {
    let progman_class = wide("Progman");
    let progman = unsafe { FindWindowW(progman_class.as_ptr(), ptr::null()) };
    if progman.is_null() {
        return Err("Windows desktop Progman window is unavailable".to_string());
    }

    let mut result = 0_usize;
    unsafe {
        let _ = SendMessageTimeoutW(
            progman,
            WM_SPAWN_WORKER,
            0xD,
            0x1,
            SMTO_NORMAL,
            1000,
            &mut result,
        );
        let _ = SendMessageTimeoutW(
            progman,
            WM_SPAWN_WORKER,
            0,
            0,
            SMTO_NORMAL,
            1000,
            &mut result,
        );
    }

    let mut worker: Hwnd = ptr::null_mut();
    unsafe {
        EnumWindows(find_worker_window, &mut worker as *mut Hwnd as isize);
    }
    if !worker.is_null() {
        return Ok(worker);
    }

    // Current Windows 11 shells can keep SHELLDLL_DefView directly under Progman
    // without creating a WorkerW sibling behind it. In that layout, using Progman
    // as the parent and placing Canvas at HWND_BOTTOM keeps desktop icons above it.
    let shell_view = wide("SHELLDLL_DefView");
    let def_view =
        unsafe { FindWindowExW(progman, ptr::null_mut(), shell_view.as_ptr(), ptr::null()) };
    if !def_view.is_null() {
        return Ok(progman);
    }

    Err("Windows desktop layer is unavailable".to_string())
}

pub fn ensure_desktop_parent_ready() -> Result<(), String> {
    desktop_parent_window().map(|_| ())
}

pub fn attach(window: &WebviewWindow) -> Result<(), String> {
    let _attach_guard = ATTACH_LOCK.lock().map_err(|error| error.to_string())?;
    let native = window.hwnd().map_err(|error| error.to_string())?;
    let hwnd = native.0;
    let desktop_parent = desktop_parent_window()?;

    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE);
        SetWindowLongPtrW(hwnd, GWL_STYLE, (style & !WS_POPUP) | WS_CHILD);
        SetParent(hwnd, desktop_parent);

        if GetParent(hwnd) != desktop_parent {
            return Err("failed to attach Desktop Canvas to the Windows desktop layer".to_string());
        }
    }

    place_canvas_on_desktop_layer(hwnd, desktop_parent)?;
    LAST_DESKTOP_PARENT.store(desktop_parent as isize, Ordering::Release);
    apply_saved_interactive_region(window)?;
    Ok(())
}

pub fn update_interactive_regions(
    window: &WebviewWindow,
    regions: Vec<[f64; 5]>,
    edit_mode: bool,
) -> Result<(), String> {
    {
        let mut state = POINTER_STATE.lock().map_err(|error| error.to_string())?;
        state.regions = regions;
        state.edit_mode = edit_mode;
    }
    apply_saved_interactive_region(window)
}

pub fn set_expected_visible(visible: bool) {
    CANVAS_EXPECTED_VISIBLE.store(visible, Ordering::Release);
}

pub fn expected_visible() -> bool {
    CANVAS_EXPECTED_VISIBLE.load(Ordering::Acquire)
}

pub fn start_recovery_monitor(app: tauri::AppHandle, window: WebviewWindow) {
    if RECOVERY_MONITOR_STARTED.swap(true, Ordering::AcqRel) {
        return;
    }

    thread::spawn(move || {
        let mut recovery_failures = 0_u32;
        let mut window = window;
        let mut last_known_visible = expected_visible();

        loop {
            thread::sleep(Duration::from_millis(1500));

            let native = match window.hwnd() {
                Ok(native) => native,
                Err(_) => continue,
            };
            let hwnd = native.0;
            if hwnd.is_null() || unsafe { IsWindow(hwnd) } == 0 {
                set_expected_visible(last_known_visible);
                match crate::rebuild_canvas_after_explorer_restart(&app) {
                    Ok(rebuilt) => {
                        window = rebuilt;
                        recovery_failures = 0;
                        request_region_resync(&window);
                        eprintln!(
                            "Desktop Canvas window recreated after Explorer destroyed its HWND"
                        );
                    }
                    Err(error) => {
                        recovery_failures = recovery_failures.saturating_add(1);
                        if recovery_failures == 1 || recovery_failures % 10 == 0 {
                            eprintln!(
                                "Desktop Canvas window recreation pending (attempt {recovery_failures}): {error}"
                            );
                        }
                    }
                }
                continue;
            }

            let current_parent = unsafe { GetParent(hwnd) };
            let expected_parent = LAST_DESKTOP_PARENT.load(Ordering::Acquire) as Hwnd;
            let parent_is_alive =
                !current_parent.is_null() && unsafe { IsWindow(current_parent) } != 0;
            let parent_is_expected =
                !expected_parent.is_null() && current_parent == expected_parent;
            let parent_is_valid_desktop =
                parent_is_alive && is_desktop_parent_window(current_parent);

            if parent_is_valid_desktop {
                last_known_visible = unsafe { IsWindowVisible(hwnd) } != 0;
                set_expected_visible(last_known_visible);
                if !parent_is_expected {
                    LAST_DESKTOP_PARENT.store(current_parent as isize, Ordering::Release);
                }
                if sync_canvas_bounds(hwnd, current_parent).unwrap_or(false) {
                    request_region_resync(&window);
                }
                recovery_failures = 0;
                continue;
            }

            match attach(&window) {
                Ok(()) => {
                    recovery_failures = 0;
                    request_region_resync(&window);
                    eprintln!("Desktop Canvas desktop layer recovered after Explorer change");
                }
                Err(error) => {
                    recovery_failures = recovery_failures.saturating_add(1);
                    if recovery_failures == 1 || recovery_failures % 10 == 0 {
                        eprintln!(
                            "Desktop Canvas desktop layer recovery pending (attempt {recovery_failures}): {error}"
                        );
                    }
                }
            }
        }
    });
}

fn sync_canvas_bounds(hwnd: Hwnd, desktop_parent: Hwnd) -> Result<bool, String> {
    let mut parent_rect = Rect {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    let mut canvas_rect = Rect {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };

    unsafe {
        if GetClientRect(desktop_parent, &mut parent_rect) == 0 {
            return Err("failed to read Windows desktop bounds".to_string());
        }
        if GetClientRect(hwnd, &mut canvas_rect) == 0 {
            return Err("failed to read Desktop Canvas bounds".to_string());
        }
    }

    let width = parent_rect.right - parent_rect.left;
    let height = parent_rect.bottom - parent_rect.top;
    let canvas_width = canvas_rect.right - canvas_rect.left;
    let canvas_height = canvas_rect.bottom - canvas_rect.top;
    if canvas_width == width && canvas_height == height {
        return Ok(false);
    }

    if unsafe {
        SetWindowPos(
            hwnd,
            canvas_insert_after(desktop_parent),
            0,
            0,
            width,
            height,
            SWP_NOACTIVATE | SWP_FRAMECHANGED,
        )
    } == 0
    {
        return Err("failed to resize Desktop Canvas on the Windows desktop layer".to_string());
    }

    Ok(true)
}

fn request_region_resync(window: &WebviewWindow) {
    let _ = window.eval(
        "window.dispatchEvent(new CustomEvent('flexikit:canvas-regions-changed'));window.dispatchEvent(new CustomEvent('flexikit:canvas-topology-changed'));",
    );
}

fn apply_saved_interactive_region(window: &WebviewWindow) -> Result<(), String> {
    let (edit_mode, regions) = {
        let state = POINTER_STATE.lock().map_err(|error| error.to_string())?;
        (state.edit_mode, state.regions.clone())
    };

    let native = window.hwnd().map_err(|error| error.to_string())?;
    let hwnd = native.0;

    if edit_mode {
        if unsafe { SetWindowRgn(hwnd, ptr::null_mut(), 1) } == 0 {
            return Err("failed to restore the full Desktop Canvas interaction region".to_string());
        }
        return Ok(());
    }

    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let combined = unsafe { CreateRectRgn(0, 0, 0, 0) };
    if combined.is_null() {
        return Err("failed to create the Desktop Canvas interaction region".to_string());
    }

    for [x, y, width, height, radius] in regions {
        if width <= 0.0 || height <= 0.0 {
            continue;
        }

        let left = (x * scale).floor() as i32 - 1;
        let top = (y * scale).floor() as i32 - 1;
        let right = ((x + width) * scale).ceil() as i32 + 1;
        let bottom = ((y + height) * scale).ceil() as i32 + 1;
        let radius_px = (radius.max(0.0) * scale).round() as i32;
        let piece = if radius_px > 0 {
            let diameter = (radius_px * 2).max(2);
            unsafe { CreateRoundRectRgn(left, top, right, bottom, diameter, diameter) }
        } else {
            unsafe { CreateRectRgn(left, top, right, bottom) }
        };
        if piece.is_null() {
            continue;
        }

        unsafe {
            let _ = CombineRgn(combined, combined, piece, RGN_OR);
            let _ = DeleteObject(piece);
        }
    }

    if unsafe { SetWindowRgn(hwnd, combined, 1) } == 0 {
        unsafe {
            let _ = DeleteObject(combined);
        }
        return Err("failed to apply the Desktop Canvas interaction region".to_string());
    }

    // Windows owns the region after a successful SetWindowRgn call.
    Ok(())
}
