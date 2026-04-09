// Use API URL from WordPress (falls back to localhost for dev)
const API_URL = (window.contentaiData && window.contentaiData.apiUrl) || 'http://localhost:3000/api';

class APIError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getLicenseHeaders() {
  const headers = {};
  if (window.contentaiData) {
    if (window.contentaiData.licenseKey) headers['x-license-key'] = window.contentaiData.licenseKey;
    if (window.contentaiData.siteUrl) headers['x-site-url'] = window.contentaiData.siteUrl;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_URL}/${endpoint}`;
  const method = options.method || 'POST';
  const licenseHeaders = getLicenseHeaders();

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...licenseHeaders,
    },
    body: method !== 'GET' ? JSON.stringify(options.body ?? {}) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new APIError(
      data.message || 'Có lỗi xảy ra. Vui lòng thử lại.',
      data.code || 'unknown_error',
      res.status
    );
  }

  return data;
}

export const api = {
  generate:  (body) => request('generate', { body }),
  generateStream: async function* (body) {
    const licenseHeaders = getLicenseHeaders();
    const res = await fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...licenseHeaders,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // Read error as text since the endpoint returns text/plain
      const text = await res.text();
      let message = 'Có lỗi xảy ra. Vui lòng thử lại.';
      try { message = JSON.parse(text).message || message; } catch { message = text.slice(0, 200) || message; }
      throw new APIError(message, 'api_error', res.status);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) yield line;
      }
    }
    if (buffer.trim()) yield buffer.trim();
  },
  rewrite:   (body) => request('rewrite',  { body }),
  quick:     (body) => request('generate', { body }),
};
