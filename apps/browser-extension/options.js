const DEFAULT_SETTINGS = {
  apiBaseUrl: 'http://127.0.0.1:3001/v1',
  accessToken: ''
};

const form = document.querySelector('#settings');
const apiBaseUrl = document.querySelector('#apiBaseUrl');
const accessToken = document.querySelector('#accessToken');
const status = document.querySelector('#status');

async function restoreSettings() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  apiBaseUrl.value = settings.apiBaseUrl;
  accessToken.value = settings.accessToken;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.className = '';
  status.textContent = '保存中…';

  try {
    await chrome.storage.local.set({
      apiBaseUrl: apiBaseUrl.value.trim().replace(/\/+$/, ''),
      accessToken: accessToken.value.trim()
    });
    status.className = 'success';
    status.textContent = '已保存';
  } catch (error) {
    status.className = 'error';
    status.textContent = error instanceof Error ? error.message : '保存失败';
  }
});

restoreSettings();
