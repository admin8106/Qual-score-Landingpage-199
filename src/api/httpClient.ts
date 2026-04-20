/**
 * Centralized HTTP client for all Java Spring Boot backend calls.
 *
 * ─── How to add a new endpoint ────────────────────────────────────────────────
 *   1. Add request/response types to the relevant section in api/contracts.ts
 *   2. Add a function to the appropriate service module (e.g. services/payments.ts)
 *   3. Call `httpClient.get()` / `httpClient.post()` from that service module
 *   4. Import and call the service function from your page component
 *
 * ─── Error handling ───────────────────────────────────────────────────────────
 *   All methods return ApiResult<T> — they never throw.
 *
 *   ok: true  → result.data contains the typed payload
 *   ok: false → result.error.code tells you what went wrong:
 *     "NETWORK_ERROR"     — no connection / DNS failure
 *     "TIMEOUT"           — request exceeded the timeout limit
 *     "VALIDATION_ERROR"  — HTTP 400/422 with field-level errors
 *     "NOT_FOUND"         — HTTP 404
 *     "UNAUTHORIZED"      — HTTP 401
 *     "FORBIDDEN"         — HTTP 403
 *     "CONFLICT"          — HTTP 409
 *     "TOO_MANY_REQUESTS" — HTTP 429
 *     "SERVER_ERROR"      — HTTP 5xx
 *     "PARSE_ERROR"       — response was not valid JSON
 *
 * ─── Request correlation ──────────────────────────────────────────────────────
 *   The backend sets X-Request-Id on all responses.
 *   Successful and error ApiResult objects carry the requestId field when present.
 *   This allows correlating frontend errors with backend log entries.
 *
 * ─── Base URL ─────────────────────────────────────────────────────────────────
 *   Configured via VITE_API_BASE_URL in .env (see src/config/env.ts).
 *   Default: http://localhost:8080
 */

import { env } from '../config/env';
import type { ApiResult, RequestOptions } from './types';
import { ok, err } from './types';

const DEFAULT_TIMEOUT_MS = 30_000;

function buildUrl(base: string, path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  const url = new URL(normalizedBase + normalizedPath);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

function statusToErrorCode(status: number): string {
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'VALIDATION_ERROR';
  if (status === 429) return 'TOO_MANY_REQUESTS';
  if (status >= 500)  return 'SERVER_ERROR';
  return 'REQUEST_FAILED';
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const {
    method = 'GET',
    body,
    queryParams,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);

  const signal = externalSignal
    ? (() => {
        externalSignal.addEventListener('abort', () => controller.abort(), { signal: controller.signal });
        return controller.signal;
      })()
    : controller.signal;

  try {
    const url = buildUrl(env.apiBaseUrl, path, queryParams);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      signal,
    };

    if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const requestId = response.headers.get('X-Request-Id') ?? undefined;

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      if (!response.ok) {
        return err(statusToErrorCode(response.status), `HTTP ${response.status}`, undefined, requestId);
      }
      return err('PARSE_ERROR', 'Response was not valid JSON', undefined, requestId);
    }

    if (!response.ok) {
      const body = json as Record<string, unknown> | null;
      const errorCode = (body?.error as Record<string, unknown> | undefined)?.code as string
        ?? (body?.code as string | undefined)
        ?? statusToErrorCode(response.status);
      const errorMsg = (body?.error as Record<string, unknown> | undefined)?.message as string
        ?? (body?.message as string | undefined)
        ?? `HTTP ${response.status}`;
      const details = (body?.error as Record<string, unknown> | undefined)?.details as import('./types').ValidationFieldError[] | undefined;

      return err(errorCode, errorMsg, details, requestId);
    }

    const envelope = json as { ok?: boolean; data?: T; error?: { code: string; message: string } };

    if (envelope && typeof envelope === 'object' && 'ok' in envelope) {
      if (envelope.ok === false && envelope.error) {
        return err(envelope.error.code, envelope.error.message, undefined, requestId);
      }
      return ok(envelope.data as T, requestId);
    }

    return ok(json as T, requestId);

  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      const isTimeout = (controller.signal.reason === 'timeout') || (!externalSignal && signal.aborted);
      return err(isTimeout ? 'TIMEOUT' : 'ABORTED', isTimeout ? 'Request timed out' : 'Request was cancelled');
    }

    const message = e instanceof Error ? e.message : 'Network request failed';

    if (!env.apiBaseUrl || env.apiBaseUrl.includes('localhost')) {
      console.warn(
        `[httpClient] Network error — VITE_API_BASE_URL is "${env.apiBaseUrl || '(empty)'}". ` +
        `If deploying to production, set VITE_API_BASE_URL to your backend origin.`
      );
    }

    return err('NETWORK_ERROR', message);
  } finally {
    clearTimeout(timeoutId);
  }
}

const RETRYABLE_CODES = new Set(['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR']);

async function withRetry<T>(
  fn: () => Promise<ApiResult<T>>,
  maxAttempts = 3,
  baseDelayMs = 400,
): Promise<ApiResult<T>> {
  let lastResult: ApiResult<T> = { ok: false, error: { code: 'UNKNOWN', message: 'No attempts made' } };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastResult = await fn();
    if (lastResult.ok) return lastResult;
    if (!RETRYABLE_CODES.has(lastResult.error.code)) return lastResult;
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
    }
  }
  return lastResult;
}

export const httpClient = {
  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResult<T>> {
    return request<T>(path, { ...options, method: 'GET' });
  },

  getWithRetry<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>, maxAttempts = 3): Promise<ApiResult<T>> {
    return withRetry(() => request<T>(path, { ...options, method: 'GET' }), maxAttempts);
  },

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResult<T>> {
    return request<T>(path, { ...options, method: 'POST', body });
  },

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResult<T>> {
    return request<T>(path, { ...options, method: 'PUT', body });
  },

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResult<T>> {
    return request<T>(path, { ...options, method: 'PATCH', body });
  },

  delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResult<T>> {
    return request<T>(path, { ...options, method: 'DELETE' });
  },

  withAuth(token: string) {
    const authHeader = { Authorization: `Bearer ${token}` };
    return {
      get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(path, { ...options, method: 'GET', headers: { ...options?.headers, ...authHeader } }),
      post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(path, { ...options, method: 'POST', body, headers: { ...options?.headers, ...authHeader } }),
      put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(path, { ...options, method: 'PUT', body, headers: { ...options?.headers, ...authHeader } }),
      patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(path, { ...options, method: 'PATCH', body, headers: { ...options?.headers, ...authHeader } }),
      delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(path, { ...options, method: 'DELETE', headers: { ...options?.headers, ...authHeader } }),
    };
  },
} as const;
