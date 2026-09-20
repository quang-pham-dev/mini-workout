import { auth } from '@/auth';
import { createApiErrorResponse } from '@/lib/observability/api-error';
import { AppError } from '@mini-workout/observability';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const workoutIdSchema = z.string().min(1).max(128);

function apiError(input: {
  code: 'AUTH_REQUIRED' | 'INPUT_INVALID';
  category: 'authentication' | 'validation';
  message: string;
  status: 400 | 401;
}) {
  return new AppError({
    ...input,
    retryable: false,
    reportable: false,
  });
}

export async function handleWorkoutEngagementRequest(
  request: Request,
  context: RouteContext,
  operation: string,
  handler: (input: { userId: string; workoutId: string }) => Promise<object>,
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user.id) {
      throw apiError({
        code: 'AUTH_REQUIRED',
        category: 'authentication',
        message: 'Authentication required',
        status: 401,
      });
    }

    const { id } = await context.params;
    const parsedId = workoutIdSchema.safeParse(id);
    if (!parsedId.success) {
      throw apiError({
        code: 'INPUT_INVALID',
        category: 'validation',
        message: 'Invalid workout id',
        status: 400,
      });
    }

    const result = await handler({
      userId: session.user.id,
      workoutId: parsedId.data,
    });
    return Response.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return createApiErrorResponse(error, request, operation);
  }
}
