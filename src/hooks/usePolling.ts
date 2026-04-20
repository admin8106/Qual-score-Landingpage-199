/**
 * usePolling — poll a backend endpoint until a terminal condition is met.
 *
 * Designed for the analysis flow, where triggerAnalysis() kicks off async
 * processing and the frontend polls getReport() until status === "COMPLETED".
 *
 * Usage:
 *   const { state, start, stop } = usePolling(
 *     () => reportsApi.getReport(candidateCode),
 *     (data) => data.reportStatus === 'COMPLETED' || data.reportStatus === 'GENERATED',
 *     { intervalMs: 2500, maxAttempts: 30 }
 *   );
 *
 *   useEffect(() => { start(); }, [candidateCode]);
 *
 * Options:
 *   intervalMs   — how often to poll (default: 2500ms)
 *   maxAttempts  — stop polling after this many attempts (default: 30 ≈ 75s at 2.5s interval)
 *   onSuccess    — called once when the terminal condition is met
 *   onExhausted  — called when maxAttempts is reached without success
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ApiResult } from '../api/types';
import type { AsyncState } from './useAsync';

interface PollingOptions<T> {
  intervalMs?: number;
  maxAttempts?: number;
  onSuccess?: (data: T) => void;
  onExhausted?: () => void;
}

export function usePolling<T>(
  fn: () => Promise<ApiResult<T>>,
  isDone: (data: T) => boolean,
  options: PollingOptions<T> = {}
) {
  const {
    intervalMs = 2500,
    maxAttempts = 30,
    onSuccess,
    onExhausted,
  } = options;

  const [state, setState] = useState<AsyncState<T>>({ status: 'idle', data: null, error: null });
  const [attempts, setAttempts] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const runningRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(async (attempt: number) => {
    if (!runningRef.current || !mountedRef.current) return;

    const result = await fn();

    if (!mountedRef.current) return;

    if (result.ok) {
      setState({ status: 'success', data: result.data, error: null });

      if (isDone(result.data)) {
        stop();
        onSuccess?.(result.data);
        return;
      }
    } else {
      setState({ status: 'error', data: null, error: result.error });
    }

    const nextAttempt = attempt + 1;
    setAttempts(nextAttempt);

    if (nextAttempt >= maxAttempts) {
      stop();
      onExhausted?.();
      return;
    }

    if (runningRef.current) {
      timerRef.current = setTimeout(() => poll(nextAttempt), intervalMs);
    }
  }, [fn, isDone, intervalMs, maxAttempts, onSuccess, onExhausted, stop]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setAttempts(0);
    setState({ status: 'loading', data: null, error: null });
    poll(0);
  }, [poll]);

  return {
    state,
    attempts,
    start,
    stop,
    isPolling: runningRef.current,
  };
}
