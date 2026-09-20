import type { WorkoutEngagement } from '@mini-workout/core/workouts';

type PublicError = {
  code?: unknown;
  message?: unknown;
  requestId?: unknown;
};

export class WorkoutApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    requestId?: string;
  }) {
    super(input.message);
    this.name = 'WorkoutApiError';
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
  }
}

function isWorkoutEngagement(value: unknown): value is WorkoutEngagement {
  if (typeof value !== 'object' || value === null) return false;

  return (
    'workoutId' in value &&
    typeof value.workoutId === 'string' &&
    'likeCount' in value &&
    typeof value.likeCount === 'number' &&
    'liked' in value &&
    typeof value.liked === 'boolean' &&
    'favorited' in value &&
    typeof value.favorited === 'boolean'
  );
}

async function parseResponse(response: Response) {
  const body: unknown = await response.json().catch(() => undefined);

  if (response.ok && isWorkoutEngagement(body)) return body;

  const publicError =
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'object' &&
    body.error !== null
      ? (body.error as PublicError)
      : undefined;

  throw new WorkoutApiError({
    status: response.status,
    code:
      typeof publicError?.code === 'string'
        ? publicError.code
        : 'INTERNAL_ERROR',
    message:
      typeof publicError?.message === 'string'
        ? publicError.message
        : 'Something went wrong. Please try again.',
    requestId:
      typeof publicError?.requestId === 'string'
        ? publicError.requestId
        : response.headers.get('x-request-id') || undefined,
  });
}

async function requestWorkoutEngagement(
  workoutId: string,
  path: 'engagement' | 'favorite' | 'like',
  method: 'GET' | 'PUT' | 'DELETE',
  signal?: AbortSignal,
) {
  const response = await fetch(
    `/api/v1/workouts/${encodeURIComponent(workoutId)}/${path}`,
    {
      method,
      signal,
      headers: { accept: 'application/json' },
    },
  );

  return parseResponse(response);
}

export function fetchWorkoutEngagement(
  workoutId: string,
  signal?: AbortSignal,
) {
  return requestWorkoutEngagement(workoutId, 'engagement', 'GET', signal);
}

export function setWorkoutLiked(workoutId: string, liked: boolean) {
  return requestWorkoutEngagement(workoutId, 'like', liked ? 'PUT' : 'DELETE');
}

export function setWorkoutFavorited(workoutId: string, favorited: boolean) {
  return requestWorkoutEngagement(
    workoutId,
    'favorite',
    favorited ? 'PUT' : 'DELETE',
  );
}
