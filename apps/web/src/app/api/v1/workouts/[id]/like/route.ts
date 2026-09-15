import { auth } from '@/auth';
import { NotFoundError, ValidationError } from '@mini-workout/core/errors';
import { setWorkoutLike } from '@mini-workout/core/workouts';
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
  if (!session?.user.id) return json({ error: 'Unauthorized' }, 401);

  const { id } = await context.params;
  if (!z.string().min(1).max(128).safeParse(id).success) {
    return json({ error: 'Invalid workout id' }, 400);
  }

  try {
    const result = await setWorkoutLike({
      userId: session.user.id,
      workoutId: id,
      liked,
    });
    return json(result);
  } catch (error) {
    if (error instanceof NotFoundError)
      return json({ error: error.message }, 404);
    if (error instanceof ValidationError)
      return json({ error: 'Invalid input' }, 400);
    throw error;
  }
}

export function PUT(request: Request, context: RouteContext) {
  return setLike(request, context, true);
}

export function DELETE(request: Request, context: RouteContext) {
  return setLike(request, context, false);
}
