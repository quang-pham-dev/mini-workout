import { auth } from '@/auth';
import { createApiErrorResponse } from '@/lib/observability/api-error';
import { setWorkoutLike } from '@mini-workout/core/workouts';
import { AppError } from '@mini-workout/observability';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

async function setLike(
  request: Request,
  context: RouteContext,
  liked: boolean,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user.id) {
    return createApiErrorResponse(
      new AppError({
        code: 'AUTH_REQUIRED',
        category: 'authentication',
        message: 'Authentication required',
        status: 401,
        retryable: false,
        reportable: false,
      }),
      request,
      'workout.like.update',
    );
  }

  const { id } = await context.params;
  if (!z.string().min(1).max(128).safeParse(id).success) {
    return createApiErrorResponse(
      new AppError({
        code: 'INPUT_INVALID',
        category: 'validation',
        message: 'Invalid workout id',
        status: 400,
        retryable: false,
        reportable: false,
      }),
      request,
      'workout.like.update',
    );
  }

  try {
    const result = await setWorkoutLike({
      userId: session.user.id,
      workoutId: id,
      liked,
    });
    return json(result);
  } catch (error) {
    return createApiErrorResponse(error, request, 'workout.like.update');
  }
}

export function PUT(request: Request, context: RouteContext) {
  return setLike(request, context, true);
}

export function DELETE(request: Request, context: RouteContext) {
  return setLike(request, context, false);
}
