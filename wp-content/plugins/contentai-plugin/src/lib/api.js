const API_URL = 'http://localhost:3000/api';

class APIError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_URL}/${endpoint}`;
  const method = options.method || 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
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
  rewrite:   (body) => request('rewrite',  { body }),
  quick:     (body) => request('generate', { body }),
};
