const fs = require('fs');
const fp = 'C:\\Users\\BAIMUXI\\Desktop\\flexikit\\frontend\\src\\views\\Home.vue';
let content = fs.readFileSync(fp, 'utf-8');

// 1. Fix span line
content = content.replace(
  /<span class="result-count">.*?<\/span>/,
  '<span class="result-count">共 {{ store.visibleCount }} 个工具</span>'
);

// 2. Fix h2 line  
content = content.replace(
  /<h2>.*?<\/h2>/,
  "<h2>{{ store.activeCategory === '全部' ? '全部工具' : store.activeCategory }}</h2>"
);

// 3. Fix 加载中...
content = content.replace(/加载.*?\.\./, '加载中..');

// 4. Remove all U+FFFD (replacement characters)
content = content.replace(/\uFFFD/g, '');

// 5. Fix any remaining mojibake for "全部"
content = content.replace(/鍏ㄩ儴/g, '全部');
content = content.replace(/鍏?/g, '共');
content = content.replace(/宸ュ叿/g, '工具');
content = content.replace(/涓伐/g, '个工');
content = content.replace(/鍔犺浇/g, '加载');

fs.writeFileSync(fp, content, 'utf-8');
console.log('Done!');

// Verify
const lines = content.split('\n');
console.log('Line 132:', lines[131]);
console.log('Line 133:', lines[132]);
console.log('Line 134:', lines[133]);
