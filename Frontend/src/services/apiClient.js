export const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function request(endpoint, options = {}) {
  const url = `${API_BASE}/${endpoint}`;
  const config = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };

  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const data = await res.json();
  
  if (!res.ok && data.status !== 'success') {
    throw new Error(data.message || 'Request failed');
  }
  
  return data;
}
