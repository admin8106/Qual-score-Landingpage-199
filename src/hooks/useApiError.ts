/**
 * useApiError — turn an ApiError into display-ready messages.
 *
 * Usage:
 *   const { message, fieldErrors, isValidation, isNetwork, isServer } = useApiError(error);
 *
 *   if (isValidation) return <FieldErrors errors={fieldErrors} />;
 *   return <Banner>{message}</Banner>;
 */

import { useMemo } from 'react';
import type { ApiError, ValidationFieldError } from '../api/types';

const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR:     'No connection. Please check your internet and try again.',
  TIMEOUT:           'The request took too long. Please try again.',
  ABORTED:           'The request was cancelled.',
  UNAUTHORIZED:      'You are not authorized to perform this action.',
  FORBIDDEN:         'Access denied.',
  NOT_FOUND:         'The requested resource was not found.',
  CONFLICT:          'A conflict occurred — this record may already exist.',
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment and try again.',
  SERVER_ERROR:      'A server error occurred. Please try again or contact support.',
  PARSE_ERROR:       'An unexpected response was received from the server.',
  VALIDATION_ERROR:  'Please check the highlighted fields and try again.',
};

export interface UseApiErrorResult {
  message: string;
  fieldErrors: Record<string, string>;
  allFieldErrors: ValidationFieldError[];
  isValidation: boolean;
  isNetwork: boolean;
  isServer: boolean;
  isAuth: boolean;
  rawError: ApiError | null;
}

export function useApiError(error: ApiError | null | undefined): UseApiErrorResult {
  return useMemo(() => {
    if (!error) {
      return {
        message: '',
        fieldErrors: {},
        allFieldErrors: [],
        isValidation: false,
        isNetwork: false,
        isServer: false,
        isAuth: false,
        rawError: null,
      };
    }

    const message = ERROR_MESSAGES[error.code] ?? error.message ?? 'An unexpected error occurred.';

    const allFieldErrors: ValidationFieldError[] = error.details ?? [];

    const fieldErrors: Record<string, string> = {};
    for (const fe of allFieldErrors) {
      fieldErrors[fe.field] = fe.message;
    }

    return {
      message,
      fieldErrors,
      allFieldErrors,
      isValidation: error.code === 'VALIDATION_ERROR',
      isNetwork: error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT',
      isServer: error.code === 'SERVER_ERROR',
      isAuth: error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN',
      rawError: error,
    };
  }, [error]);
}

export function friendlyError(error: ApiError | null | undefined): string {
  if (!error) return '';
  return ERROR_MESSAGES[error.code] ?? error.message ?? 'An unexpected error occurred.';
}
