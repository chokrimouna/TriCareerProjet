import { API_BASE_URL } from '../config';

const getToken = () =>
  localStorage.getItem('tricareer_token') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('tricareer_token') ||
  sessionStorage.getItem('token');

type ApiError = Error & {
  status?: number;
  data?: any;
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getToken();

  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Only set application/json if it's not FormData
  if (!isFormData) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const text = await res.text();

  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const error = new Error(
      data?.message ||
      data?.detail ||
      data?.title ||
      (typeof data === 'string' ? data : `API error: ${res.status}`)
    ) as ApiError;

    error.status = res.status;
    error.data = data;

    throw error;
  }

  return data as T;
};

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),

  post: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'DELETE',
    }),
};
