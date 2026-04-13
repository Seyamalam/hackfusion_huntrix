import { useCallback, useEffect, useRef, useState } from 'react';

type BackendReconnectOptions = {
  intervalMs?: number;
  onError?: (error: unknown) => void;
  onSuccess: () => void;
};

type BackendReconnectState = {
  backendState: 'fallback' | 'live' | 'reconnecting';
  isRefreshing: boolean;
  lastSuccessAt: string | null;
  reconnect: () => Promise<void>;
};

export function useBackendReconnect(
  load: (signal: AbortSignal) => Promise<void>,
  options: BackendReconnectOptions,
): BackendReconnectState {
  const intervalMs = options.intervalMs ?? 10000;
  const mountedRef = useRef(true);
  const loadRef = useRef(load);
  const onSuccessRef = useRef(options.onSuccess);
  const onErrorRef = useRef(options.onError);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);
  const [backendState, setBackendState] =
    useState<BackendReconnectState['backendState']>('reconnecting');

  loadRef.current = load;
  onSuccessRef.current = options.onSuccess;
  onErrorRef.current = options.onError;

  const reconnect = useCallback(async () => {
    const controller = new AbortController();
    if (mountedRef.current) {
      setIsRefreshing(true);
      setBackendState((current) => (current === 'live' ? 'reconnecting' : current));
    }

    try {
      await loadRef.current(controller.signal);
      if (!mountedRef.current) {
        return;
      }
      const now = new Date().toISOString();
      setBackendState('live');
      setLastSuccessAt(now);
      onSuccessRef.current();
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setBackendState((current) => (current === 'live' ? 'reconnecting' : 'fallback'));
      onErrorRef.current?.(error);
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
      controller.abort();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void reconnect();

    const interval = setInterval(() => {
      void reconnect();
    }, intervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [intervalMs, reconnect]);

  return {
    backendState,
    isRefreshing,
    lastSuccessAt,
    reconnect,
  };
}
