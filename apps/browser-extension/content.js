(() => {
  if (window.__flexikitInjected) return;
  window.__flexikitInjected = true;

  const root = document.createElement('div');
  root.id = 'flexikit-root';
  const shadow = root.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <button class="float" type="button" aria-label="打开 FlexiKit"><span>F</span></button>
    <div class="panel" role="dialog" aria-label="FlexiKit Browser Companion">
      <b>FlexiKit</b>
      <div class="name"></div>
      <small class="url"></small>
      <button class="add" type="button">+ 添加到工具箱</button>
      <button class="settings" type="button">连接设置</button>
      <small class="status" aria-live="polite"></small>
    </div>
    <style>
      .float{position:fixed;right:24px;top:120px;width:48px;height:48px;border-radius:16px;border:0;background:linear-gradient(135deg,#171717,#3b3b3b);color:white;z-index:2147483647;cursor:pointer;font-size:20px;font-weight:700;box-shadow:0 12px 35px #0005;transition:transform .2s ease}.float:hover{transform:scale(1.08)}
      .panel{display:none;position:fixed;right:24px;top:176px;width:280px;padding:18px;border-radius:18px;background:#171717;color:white;z-index:2147483647;font-family:Arial,sans-serif;box-shadow:0 12px 40px #0005}
      .name{margin-top:12px;font-weight:600}.url{display:block;overflow:hidden;margin-top:8px;opacity:.7;text-overflow:ellipsis;white-space:nowrap}
      .add,.settings{margin-top:14px;width:100%;padding:10px;border:0;border-radius:10px;cursor:pointer}.settings{margin-top:8px;background:#333;color:#fff}
      .add:disabled{cursor:wait;opacity:.65}.status{display:block;min-height:18px;margin-top:10px;line-height:18px}.status.error{color:#ff9b9b}.status.success{color:#8ee6a2}
    </style>`;

  document.documentElement.appendChild(root);

  const data = {
    name: document.title || location.hostname,
    url: location.href,
    icon: document.querySelector('link[rel~="icon"]')?.href || `${location.origin}/favicon.ico`,
    description: document.querySelector('meta[name="description"]')?.content || '',
     captureSource: 'browser-extension-v1'
  };

  const float = shadow.querySelector('.float');
  const panel = shadow.querySelector('.panel');
  const addButton = shadow.querySelector('.add');
  const status = shadow.querySelector('.status');
  shadow.querySelector('.name').textContent = data.name;
  shadow.querySelector('.url').textContent = data.url;

  float.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  });

  shadow.querySelector('.settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  addButton.addEventListener('click', async () => {
    addButton.disabled = true;
    status.className = 'status';
    status.textContent = '正在添加…';

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'FLEXIKIT_ADD_TOOL',
        data
      });

      if (!response?.ok) {
        throw new Error(response?.error || '添加失败');
      }

      status.className = 'status success';
      status.textContent = '已添加到 FlexiKit';
      await chrome.storage.local.set({ lastAddedTool: data });
    } catch (error) {
      status.className = 'status error';
      status.textContent = error instanceof Error ? error.message : '添加失败';
    } finally {
      addButton.disabled = false;
    }
  });
})();
