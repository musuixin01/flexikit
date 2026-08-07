-- 更新发现时间，让不同时间段都有数据

-- 今日发现的工具（3个）
UPDATE discovery_tools SET discovered_at = NOW() WHERE name IN ('Everything', 'Hoppscotch', 'Flameshot');

-- 本周发现的工具（3个，2-3天前）
UPDATE discovery_tools SET discovered_at = NOW() - INTERVAL '2 days' WHERE name IN ('Raycast', 'Obsidian', 'Tabby');
UPDATE discovery_tools SET discovered_at = NOW() - INTERVAL '3 days' WHERE name IN ('Snipaste', 'ImageOptim');

-- 本月发现的工具（剩下的，1-2周前）
UPDATE discovery_tools SET discovered_at = NOW() - INTERVAL '7 days' WHERE name IN ('Linear', 'Notion', 'Figma', 'PotPlayer', 'Traffic Monitor', 'KeePassXC');
UPDATE discovery_tools SET discovered_at = NOW() - INTERVAL '10 days' WHERE name IN ('HandShaker');
