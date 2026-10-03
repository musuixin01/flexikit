#[cfg(target_os = "windows")]
#[repr(C)]
#[derive(Clone, Copy)]
struct FileTime {
    low: u32,
    high: u32,
}

#[cfg(target_os = "windows")]
#[repr(C)]
struct MemoryStatusEx {
    length: u32,
    memory_load: u32,
    total_phys: u64,
    avail_phys: u64,
    total_page_file: u64,
    avail_page_file: u64,
    total_virtual: u64,
    avail_virtual: u64,
    avail_extended_virtual: u64,
}

#[cfg(target_os = "windows")]
#[link(name = "kernel32")]
extern "system" {
    fn GetSystemTimes(
        idle_time: *mut FileTime,
        kernel_time: *mut FileTime,
        user_time: *mut FileTime,
    ) -> i32;
    fn GlobalMemoryStatusEx(buffer: *mut MemoryStatusEx) -> i32;
    fn GetTickCount64() -> u64;
}

#[cfg(target_os = "windows")]
fn file_time_millis(value: FileTime) -> u64 {
    (((value.high as u64) << 32) | value.low as u64) / 10_000
}

#[cfg(target_os = "windows")]
pub type SystemMonitorSnapshot = (u64, u64, u64, u64, u64);

#[cfg(target_os = "windows")]
pub fn snapshot() -> Result<SystemMonitorSnapshot, String> {
    let mut idle = FileTime { low: 0, high: 0 };
    let mut kernel = FileTime { low: 0, high: 0 };
    let mut user = FileTime { low: 0, high: 0 };

    if unsafe { GetSystemTimes(&mut idle, &mut kernel, &mut user) } == 0 {
        return Err("failed to read CPU system times".to_string());
    }

    let mut memory = MemoryStatusEx {
        length: std::mem::size_of::<MemoryStatusEx>() as u32,
        memory_load: 0,
        total_phys: 0,
        avail_phys: 0,
        total_page_file: 0,
        avail_page_file: 0,
        total_virtual: 0,
        avail_virtual: 0,
        avail_extended_virtual: 0,
    };

    if unsafe { GlobalMemoryStatusEx(&mut memory) } == 0 {
        return Err("failed to read system memory information".to_string());
    }

    let idle_ms = file_time_millis(idle);
    let total_ms = file_time_millis(kernel).saturating_add(file_time_millis(user));
    let uptime_ms = unsafe { GetTickCount64() };

    Ok((
        idle_ms,
        total_ms,
        memory.total_phys,
        memory.avail_phys,
        uptime_ms,
    ))
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use super::*;

    #[test]
    fn converts_file_time_to_milliseconds() {
        let ticks = 123_456_780_u64;
        let value = FileTime {
            low: ticks as u32,
            high: (ticks >> 32) as u32,
        };
        assert_eq!(file_time_millis(value), 12_345);
    }

    #[test]
    fn reads_real_system_monitor_snapshot() {
        let (idle_ms, total_ms, total_memory, available_memory, uptime_ms) =
            snapshot().expect("system monitor snapshot failed");

        assert!(
            total_ms >= idle_ms,
            "CPU total time is smaller than idle time"
        );
        assert!(total_memory > 0, "physical memory total is zero");
        assert!(
            available_memory <= total_memory,
            "available memory exceeds total memory"
        );
        assert!(uptime_ms > 0, "system uptime is zero");
    }
}
