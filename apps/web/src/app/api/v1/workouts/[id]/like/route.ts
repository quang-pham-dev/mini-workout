import { handleWorkoutEngagementRequest } from '@/lib/workouts/engagement-route';
import { setWorkoutLike } from '@mini-workout/core/workouts';

type RouteContext = { params: Promise<{ id: string }> };

function setLike(request: Request, context: RouteContext, liked: boolean) {
  return handleWorkoutEngagementRequest(
    request,
    context,
    'workout.like.update',
    (input) => setWorkoutLike({ ...input, liked }),
  );
}

export function PUT(request: Request, context: RouteContext) {
  return setLike(request, context, true);
}

export function DELETE(request: Request, context: RouteContext) {
  return setLike(request, context, false);
}
