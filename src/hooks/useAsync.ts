/**
 * useAsync — execute an async operation and track its loading/success/error state.
 *
 * Usage:
 *   const { execute, state } = useAsync(diagnosticApi.getQuestions);
 *
 *   useEffect(() => { execute(); }, []);
 *
 *   if (state.status === 'loading') return <Spinner />;
 *   if (state.status === 'error')   return <ErrorMessage error={state.error} />;
 *   return <QuestionList data={state.data} />;
 *
 * Features:
 *   - Tracks loading / success / error state
 *   - Prevents stale updates when the component unmounts
 *   - Exposes the last error for display or retry decisions
 *   - Works with any function returning ApiResult<T>
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ApiResult, ApiError } from '../api/types';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export type AsyncState<T> =
  | { status: 'idle';    data: null;  error: null }
  | { status: 'loading'; data: null;  error: null }
  | { status: 'success'; data: T;     error: null }
  | { status: 'error';   data: null;  error: ApiError };

const idle = <T>(): AsyncState<T> => ({ status: 'idle', data: null, error: null });

export function useAsync<TArgs extends unknown[], TData>(
  fn: (...args: TArgs) => Promise<ApiResult<TData>>
) {
  const [state, setState] = useState<AsyncState<TData>>(idle<TData>());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args: TArgs): Promise<ApiResult<TData>> => {
    setState({ status: 'loading', data: null, error: null });

    const result = await fn(...args);

    if (!mountedRef.current) return result;

    if (result.ok) {
      setState({ status: 'success', data: result.data, error: null });
    } else {
      setState({ status: 'error', data: null, error: result.error });
    }

    return result;
  }, [fn]);

  const reset = useCallback(() => {
    setState(idle<TData>());
  }, []);

  return { state, execute, reset, isLoading: state.status === 'loading' };
}
