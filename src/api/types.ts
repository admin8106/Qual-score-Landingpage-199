/**
 * Core API types shared across all service modules.
 *
 * These types model the Java backend's standardized response envelope and
 * error structures. All service functions return ApiResult<T> — they never
 * throw. Callers check result.ok before accessing result.data.
 *
 * Backend envelope format:
 *   { ok: true,  data: T,     requestId?: string }
 *   { ok: false, error: ApiError, requestId?: string }
 */

export interface ApiError {
  code: string;
  message: string;
  details?: ValidationFieldError[];
}

export interface ValidationFieldError {
  field: string;
  message: string;
  rejectedValue?: unknown;
}

export type ApiResult<T> =
  | { ok: true;  data: T;    requestId?: string }
  | { ok: false; error: ApiError; requestId?: string };

export function isOk<T>(result: ApiResult<T>): result is { ok: true; data: T; requestId?: string } {
  return result.ok === true;
}

export function isErr<T>(result: ApiResult<T>): result is { ok: false; error: ApiError; requestId?: string } {
  return result.ok === false;
}

export function ok<T>(data: T, requestId?: string): ApiResult<T> {
  return { ok: true, data, requestId };
}

export function err(code: string, message: string, details?: ValidationFieldError[], requestId?: string): ApiResult<never> {
  return { ok: false, error: { code, message, details }, requestId };
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  queryParams?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
