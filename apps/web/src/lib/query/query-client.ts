import { QueryClient, isServer } from '@tanstack/react-query';

const DEFAULT_STALE_TIME = 60_000;
const DEFAULT_GC_TIME = 10 * 60_000;

function getErrorStatus(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }

  return undefined;
}

export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;
  if (error instanceof DOMException && error.name === 'AbortError')
    return false;

  const status = getErrorStatus(error);
  return status === undefined || status >= 500;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        networkMode: 'online',
      },
      mutations: {
        retry: false,
        networkMode: 'online',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
