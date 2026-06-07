// 모든 백엔드 호출의 단일 통로. base URL, JWT 헤더, envelope 디코딩, 에러 정규화를 여기서만 처리한다.
// 다른 도메인 모듈은 이 client 의 함수를 통해서만 네트워크에 접근한다.
//
// 토큰 저장 전략
//   - 메모리 캐시 (tokenCache) 가 단일 출처. fetch 요청은 이 캐시만 읽어 Authorization 헤더를 만든다.
//   - sessionStorage 는 같은 탭 내 페이지 리로드 시 캐시를 복원하기 위한 보조 수단.
//   - localStorage 는 사용하지 않는다 — XSS 가 disk 영속 토큰을 들고 도망갈 수 있는 표면을 줄인다.
//   - 탭을 닫으면 sessionStorage 도 함께 소거된다 — 공용 기기에서의 잔류 위험을 낮춘다.

import { env } from '../lib/env';
import type { ApiEnvelope, ApiError } from './types';

const TOKEN_STORAGE_KEY = 'echo.accessToken';

// 메모리 캐시 — 모든 fetch 요청이 읽는 SSOT.
// 모듈 로드 시 sessionStorage 에서 복원한다 (같은 탭 페이지 리로드 후 재인증을 막기 위함).
let tokenCache: string | null = readSessionToken();

export class ApiException extends Error {
  readonly code: string;
  readonly status: number;

  constructor(error: ApiError, status: number) {
    // message 가 빈 문자열이면 Error.message 도 빈 문자열이 되어 토스트 / 로그에 공백만 보이는
    // 사용자 불친절 회귀가 생긴다. 백엔드가 message 를 비워도 code 를 사용해 식별 가능한 텍스트를 보장한다.
    super(error.message && error.message.length > 0 ? error.message : error.code);
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

function readSessionToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null) {
  tokenCache = token;
  try {
    if (token === null) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } else {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // sessionStorage 비활성화 환경 (일부 시크릿 / 임베디드 브라우저) 은 메모리 캐시만으로 동작한다.
  }
}

export function getAccessToken(): string | null {
  return tokenCache;
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
  if (tokenCache) headers['Authorization'] = `Bearer ${tokenCache}`;

  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  } else if (init.formData) {
    body = init.formData;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, init.query), { method, headers, body, signal: init.signal });
  } catch (err) {
    // AbortSignal 로 끊긴 요청은 정상 흐름 — 호출 측이 같은 ApiException 분기에서 ABORTED 코드로 식별할 수 있게 통일한다.
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiException({ code: 'ABORTED', message: '요청이 취소되었습니다.' }, 0);
    }
    throw err;
  }

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
  put: <T>(path: string, init?: RequestInit) => request<T>('PUT', path, init),
  patch: <T>(path: string, init?: RequestInit) => request<T>('PATCH', path, init),
  delete: <T>(path: string, init?: RequestInit) => request<T>('DELETE', path, init),
};
