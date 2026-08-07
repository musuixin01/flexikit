/**
 * 数据迁移脚本：将 data.js 中的内置工具导入 PostgreSQL
 * 用法: node scripts/migrate-data.js
 */
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const dataJsPath = 'C:/Users/BAIMUXI/Desktop/Tools Hub/data.js';
const content = fs.readFileSync(dataJsPath, 'utf-8');

// 提取 FAC 数组
const start = content.indexOf('[');
const end = content.indexOf('];');
if (start === -1 || end === -1) { console.error('Failed to parse'); process.exit(1); }
const facStr = content.substring(start, end + 1);

// 用 vm 执行 JS
const sandbox = {};
const ctx = vm.createContext(sandbox);
new vm.Script('FAC = ' + facStr + ';').runInContext(ctx);
const facArray = ctx.FAC || [];
console.log(`📦 找到 ${facArray.length} 个内置工具`);

const tools = facArray.map(t => ({
  name: t.name, url: t.url || '', description: t.desc || '',
  category: t.cat || '', tags: t.tags || [], icon: t.icon || '',
  isCustom: false, userId: null,
}));

const pool = new Pool({
  host: 'localhost', port: 5432, user: 'flexikit',
  password: 'flexikit123', database: 'flexikit_db',
});

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT COUNT(*) as c FROM tools');
    if (parseInt(rows[0].c) > 0) {
      console.log(`⚠️  数据库已有 ${rows[0].c} 条记录，清空后重试`);
      await client.query('DELETE FROM tools');
      console.log('  已清空 tools 表');
    }

    let inserted = 0;
    for (const tool of tools) {
      await client.query(
        `INSERT INTO tools (name, url, description, category, tags, icon, is_custom, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tool.name, tool.url, tool.description, tool.category, tool.tags, tool.icon, tool.isCustom, tool.userId]
      );
      inserted++;
      if (inserted % 10 === 0) console.log(`  ✅ ${inserted}/${tools.length}`);
    }
    console.log(`\n🎉 导入 ${inserted} 个工具成功`);

    const catRes = await client.query(`SELECT category, COUNT(*) as cnt FROM tools WHERE category IS NOT NULL GROUP BY category ORDER BY category`);
    console.log('\n📊 分类统计:');
    catRes.rows.forEach(r => console.log(`  ${r.category}: ${r.cnt}`));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error('Migration failed:', err); pool.end(); process.exit(1); });
