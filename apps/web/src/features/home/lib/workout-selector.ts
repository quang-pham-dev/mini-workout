import { withUserId } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import 'server-only';

export type WorkoutWithUserContext = Prisma.WorkoutGetPayload<{
  select: ReturnType<typeof withUserId>;
}>;
