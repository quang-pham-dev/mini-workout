import { handleWorkoutEngagementRequest } from '@/lib/workouts/engagement-route';
import { setWorkoutFavorite } from '@mini-workout/core/workouts';

type RouteContext = { params: Promise<{ id: string }> };

function setFavorite(
  request: Request,
  context: RouteContext,
  favorited: boolean,
) {
  return handleWorkoutEngagementRequest(
    request,
    context,
    'workout.favorite.update',
    (input) => setWorkoutFavorite({ ...input, favorited }),
  );
}

export function PUT(request: Request, context: RouteContext) {
  return setFavorite(request, context, true);
}

export function DELETE(request: Request, context: RouteContext) {
  return setFavorite(request, context, false);
}
