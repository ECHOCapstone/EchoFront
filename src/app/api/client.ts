// 모든 백엔드 호출의 단일 통로. base URL, JWT 헤더, envelope 디코딩, 에러 정규화를 여기서만 처리한다.
// 다른 도메인 모듈은 이 client 의 함수를 통해서만 네트워크에 접근한다.

import { env } from '../lib/env';
import type { ApiEnvelope, ApiError } from './types';

const TOKEN_STORAGE_KEY = 'echo.accessToken';

export class ApiException extends Error {
  readonly code: string;
  readonly status: number;

  constructor(error: ApiError, status: number) {
    super(error.message);
    this.code = error.code;
    this.status = status;
  }
}

type RequestInit = {
  query?: Record<string, string | number | boolean | undefined | null>;
  json?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  expect?: 'json' | 'blob';
};

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null) {
  try {
    if (token === null) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } else {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // localStorage 비활성화 환경(시크릿 모드 등)은 무시한다.
  }
}

export function getAccessToken(): string | null {
  return readToken();
}

function buildUrl(path: string, query?: RequestInit['query']): string {
  const base = env.apiBaseUrl.replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs.length > 0 ? `${url}?${qs}` : url;
}

async function request<T>(method: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  const token = readToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  } else if (init.formData) {
    body = init.formData;
  }

  const response = await fetch(buildUrl(path, init.query), { method, headers, body, signal: init.signal });

  if (init.expect === 'blob') {
    if (!response.ok) {
      const fallback: ApiError = { code: `HTTP_${response.status}`, message: response.statusText };
      throw new ApiException(fallback, response.status);
    }
    return (await response.blob()) as unknown as T;
  }

  const text = await response.text();
  let parsed: ApiEnvelope<T> | null = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      parsed = null;
    }
  }
  if (!response.ok) {
    const error: ApiError = parsed?.error ?? { code: `HTTP_${response.status}`, message: response.statusText };
    throw new ApiException(error, response.status);
  }
  if (!parsed) {
    return undefined as T;
  }
  if (!parsed.success) {
    throw new ApiException(parsed.error, response.status);
  }
  return parsed.data;
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, init),
  post: <T>(path: string, init?: RequestInit) => request<T>('POST', path, init),
  patch: <T>(path: string, init?: RequestInit) => request<T>('PATCH', path, init),
  delete: <T>(path: string, init?: RequestInit) => request<T>('DELETE', path, init),
};
