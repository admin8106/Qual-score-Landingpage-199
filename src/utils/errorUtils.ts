/**
 * Centralised error message utilities.
 *
 * Maps ApiError codes to plain-English user-facing messages.
 * Never exposes technical details or HTTP status codes.
 */

import type { ApiError } from '../api/types';

// ─── User-facing message map ───────────────────────────────────────────────────

const FRIENDLY: Record<string, string> = {
  NETWORK_ERROR:     'No internet connection. Please check your network and try again.',
  TIMEOUT:           'The request took too long. Please try again.',
  ABORTED:           'The request was cancelled.',
  UNAUTHORIZED:      'You need to sign in to continue.',
  FORBIDDEN:         'You don\'t have permission to do this.',
  NOT_FOUND:         'We couldn\'t find what you were looking for.',
  CONFLICT:          'This record already exists.',
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment and try again.',
  SERVER_ERROR:      'Something went wrong on our end. Please try again.',
  PARSE_ERROR:       'We received an unexpected response. Please try again.',
  VALIDATION_ERROR:  'Please check the highlighted fields and try again.',
};

// ─── Primary helper ────────────────────────────────────────────────────────────

export function friendlyMessage(error: ApiError | null | undefined, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;
  return FRIENDLY[error.code] ?? error.message ?? fallback;
}

// ─── Type guards ───────────────────────────────────────────────────────────────

export function isNetworkError(error: ApiError | null | undefined): boolean {
  return error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT';
}

export function isTimeoutError(error: ApiError | null | undefined): boolean {
  return error?.code === 'TIMEOUT';
}

export function isNotFoundError(error: ApiError | null | undefined): boolean {
  return error?.code === 'NOT_FOUND';
}

export function isServerError(error: ApiError | null | undefined): boolean {
  return error?.code === 'SERVER_ERROR';
}

export function isValidationError(error: ApiError | null | undefined): boolean {
  return error?.code === 'VALIDATION_ERROR';
}

export function isAuthError(error: ApiError | null | undefined): boolean {
  return error?.code === 'UNAUTHORIZED' || error?.code === 'FORBIDDEN';
}

// ─── Field error extraction ────────────────────────────────────────────────────

export function extractFieldErrors(error: ApiError | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!error?.details) return out;
  for (const fe of error.details) {
    out[fe.field] = fe.message;
  }
  return out;
}
