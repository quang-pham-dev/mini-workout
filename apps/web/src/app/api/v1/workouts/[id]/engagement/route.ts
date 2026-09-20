import { handleWorkoutEngagementRequest } from '@/lib/workouts/engagement-route';
import { getWorkoutEngagement } from '@mini-workout/core/workouts';

type RouteContext = { params: Promise<{ id: string }> };

export function GET(request: Request, context: RouteContext) {
  return handleWorkoutEngagementRequest(
    request,
    context,
    'workout.engagement.read',
    getWorkoutEngagement,
  );
}
