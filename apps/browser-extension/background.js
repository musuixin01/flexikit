const DEFAULT_SETTINGS = {
  apiBaseUrl: 'http://127.0.0.1:3001/v1',
  accessToken: ''
};

function normalizeBaseUrl(value) {
  return (value || DEFAULT_SETTINGS.apiBaseUrl).trim().replace(/\/+$/, '');
}

function getErrorMessage(payload, status) {
  if (Array.isArray(payload?.message)) return payload.message.join('、');
  if (typeof payload?.message === 'string') return payload.message;
  if (typeof payload?.error === 'string') return payload.error;
  return `FlexiKit API 请求失败（HTTP ${status}）`;
}

async function addTool(data) {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const accessToken = settings.accessToken.trim();

  if (!accessToken) {
    throw new Error('请先在“连接设置”中填写访问令牌');
  }

  const response = await fetch(`${normalizeBaseUrl(settings.apiBaseUrl)}/tools`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Keep the HTTP status as the actionable failure when the response is not JSON.
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }

  if (payload?.code === 0 && payload?.message === 'success' && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'FLEXIKIT_ADD_TOOL') return false;

  addTool(message.data)
    .then((tool) => sendResponse({ ok: true, tool }))
    .catch((error) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : '添加失败'
    }));

  return true;
});
