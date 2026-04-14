// Use API URL from WordPress (falls back to localhost for dev)
const API_URL = (typeof window !== 'undefined' && window.contentaiData && window.contentaiData.apiUrl)
  || 'http://localhost:3000/api';

class APIError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getLicenseHeaders() {
  const headers = {};
  if (typeof window !== 'undefined' && window.contentaiData) {
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

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message = typeof data === 'string'
      ? (data.slice(0, 200) || 'Có lỗi xảy ra. Vui lòng thử lại.')
      : (data.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    throw new APIError(
      message,
      typeof data === 'string' ? 'unknown_error' : (data.code || 'unknown_error'),
      res.status
    );
  }

  return data;
}

function parseStreamErrorPayload(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { message: 'Có lỗi xảy ra. Vui lòng thử lại.', code: 'stream_error' };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return {
      message: parsed.message || 'Có lỗi xảy ra. Vui lòng thử lại.',
      code: parsed.code || 'stream_error',
    };
  } catch {
    return { message: trimmed, code: 'stream_error' };
  }
}

async function collectGenerateResult(body, onProgress) {
  let finalResult = null;

  for await (const line of api.generateStream(body)) {
    if (line.startsWith('[DONE]')) {
      finalResult = JSON.parse(line.slice(6).trim());
      continue;
    }
    if (line.startsWith('[ERROR]')) {
      const message = line.slice(7).trim() || 'Có lỗi xảy ra. Vui lòng thử lại.';
      throw new APIError(message, 'stream_error', 500);
    }
    onProgress?.(line);
  }

  if (!finalResult) {
    throw new APIError('Không nhận được kết quả từ server.', 'empty_stream', 502);
  }

  return finalResult;
}

export const api = {
  generate:  (body) => collectGenerateResult(body),
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
      const text = await res.text();
      const { message, code } = parseStreamErrorPayload(text);
      throw new APIError(message, code, res.status);
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
        const trimmed = line.trim();
        if (trimmed) yield trimmed;
      }
    }
    if (buffer.trim()) yield buffer.trim();
  },
  getUsage:   (domain) => request('license/usage', { body: { domain } }),
  rewrite:   (body) => request('rewrite',  { body }),
  quick:     (body) => collectGenerateResult(body),
};
