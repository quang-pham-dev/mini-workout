import { requireOnboardedUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

type WorkoutDetailQueryProps = {
  slug: string;
};

export async function WorkoutDetailQuery({ slug }: WorkoutDetailQueryProps) {
  const { session } = await requireOnboardedUser();

  const workout = await prisma.workout.findUnique({
    where: { slug, isPublished: true },
    include: {
      coach: true,
      category: true,
      _count: { select: { likes: true } },
      likes: {
        where: { userId: session.user.id },
        select: { userId: true },
      },
      favorites: {
        where: { userId: session.user.id },
        select: { userId: true },
      },
    },
  });

  return workout;
}
