-- 更新发现页工具的 SVG 图标（第一批次）

-- Raycast - 启动器
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#ff6363" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="5" stroke-width="2"/><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>' WHERE name = 'Raycast';

-- Linear - 项目管理
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#5e6ad2" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3" stroke-width="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="14" y2="12"/><line x1="7" y1="16" x2="11" y2="16"/><circle cx="17" cy="16" r="1.5" fill="#5e6ad2"/></svg>' WHERE name = 'Linear';

-- Notion - 笔记协作
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3" stroke-width="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>' WHERE name = 'Notion';

-- Figma - 设计工具
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#f24e1e" stroke-width="1.5"><path d="M12 3h-3a3 3 0 0 0 0 6h3V3z" fill="#f24e1e" fill-opacity=".2"/><path d="M12 9h-3a3 3 0 0 0 0 6h3V9z" fill="#a259ff" fill-opacity=".2"/><path d="M12 15h-3a3 3 0 1 0 0 6h3v-6z" fill="#1abcfe" fill-opacity=".2"/><path d="M12 3h3a3 3 0 0 1 0 6h-3V3z" fill="#ff7262" fill-opacity=".2"/><circle cx="15" cy="12" r="3" fill="#0acf83" fill-opacity=".2"/></svg>' WHERE name = 'Figma';

-- Obsidian - 知识管理
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5"><polygon points="12 2 22 8 12 14 2 8 12 2"/><polygon points="2 17 12 23 22 17"/></svg>' WHERE name = 'Obsidian';

-- Everything - 文件搜索
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#0078d7" stroke-width="1.5"><circle cx="11" cy="11" r="7" stroke-width="2"/><line x1="16" y1="16" x2="21" y2="21"/><path d="M8 11h6M11 8v6"/></svg>' WHERE name = 'Everything';

-- PotPlayer - 视频播放器
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#e8a039" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2" stroke-width="2"/><polygon points="10 9 16 12 10 15" fill="#e8a039"/></svg>' WHERE name = 'PotPlayer';

-- Snipaste - 截图工具
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#0071e3" stroke-width="1.5"><circle cx="12" cy="12" r="10" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#0071e3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>' WHERE name = 'Snipaste';

-- Traffic Monitor - 网速监控
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/><polyline points="4 16 9 11 12 14 20 6"/><line x1="16" y1="18" x2="20" y2="18"/></svg>' WHERE name = 'Traffic Monitor';

-- HandShaker - 手机文件管理
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5"><rect x="5" y="2" width="6" height="12" rx="1" stroke-width="2"/><rect x="13" y="10" width="6" height="12" rx="1" stroke-width="2"/><path d="M8 14v4M16 8v2"/></svg>' WHERE name = 'HandShaker';

-- Hoppscotch - API测试
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.5"><polyline points="5 12 10 7 15 12 10 17" stroke-width="2"/><line x1="15" y1="12" x2="20" y2="12" stroke-width="2"/></svg>' WHERE name = 'Hoppscotch';

-- Tabby - 终端模拟器
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.5"><rect x="2" y="3" width="20" height="18" rx="2" stroke-width="2"/><polyline points="7 9 10 12 7 15"/><line x1="12" y1="15" x2="17" y2="15"/></svg>' WHERE name = 'Tabby';

-- ImageOptim - 图片压缩
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="#f97316"/><polyline points="21 15 16 10 5 21"/><path d="M14 20h4a2 2 0 0 0 2-2v-4"/></svg>' WHERE name = 'ImageOptim';

-- KeePassXC - 密码管理
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5"><rect x="5" y="11" width="14" height="10" rx="2" stroke-width="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1" fill="#3b82f6"/></svg>' WHERE name = 'KeePassXC';

-- Flameshot - 截图工具
UPDATE discovery_tools SET icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="9" stroke-width="2"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/><path d="M8 8l8 8M16 8l-8 8"/></svg>' WHERE name = 'Flameshot';
