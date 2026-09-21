import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const interests = [
  { name: 'Strength', slug: 'strength' },
  { name: 'Yoga', slug: 'yoga' },
  { name: 'Mobility', slug: 'mobility' },
  { name: 'HIIT', slug: 'hiit' },
  { name: 'Pilates', slug: 'pilates' },
  { name: 'Meditation', slug: 'meditation' },
  { name: 'Cardio', slug: 'cardio' },
  { name: 'Stretching', slug: 'stretching' },
];

const categories = [
  { name: 'Strength', slug: 'strength' },
  { name: 'Mobility', slug: 'mobility' },
  { name: 'Mindful movement', slug: 'mindful-movement' },
];

const coaches = [
  {
    name: 'Maya Chen',
    slug: 'maya-chen',
    bio: 'Strength coach for calmer, more capable days.',
  },
  {
    name: 'Jon Bell',
    slug: 'jon-bell',
    bio: 'Mobility and movement coach for real-life bodies.',
  },
];

const workouts = [
  {
    title: 'The 20-minute reset',
    slug: 'the-20-minute-reset',
    description:
      'A focused full-body session to bring your energy back online.',
    durationMinutes: 20,
    level: 'BEGINNER' as const,
    videoUrl:
      'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4',
    videoSourceType: 'MP4' as const,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
    coachSlug: 'maya-chen',
    categorySlug: 'strength',
    interestSlugs: ['strength', 'hiit'],
  },
  {
    title: 'Move better, feel lighter',
    slug: 'move-better-feel-lighter',
    description: 'Gentle mobility work for the places that hold onto the day.',
    durationMinutes: 15,
    level: 'BEGINNER' as const,
    videoUrl:
      'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8',
    videoSourceType: 'HLS' as const,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    coachSlug: 'jon-bell',
    categorySlug: 'mobility',
    interestSlugs: ['mobility', 'stretching', 'yoga'],
  },
  {
    title: 'Build your base',
    slug: 'build-your-base',
    description:
      'A steady strength session for building confidence from the ground up.',
    durationMinutes: 30,
    level: 'INTERMEDIATE' as const,
    videoUrl:
      'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4',
    videoSourceType: 'MP4' as const,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=80',
    coachSlug: 'maya-chen',
    categorySlug: 'strength',
    interestSlugs: ['strength'],
  },
  {
    title: 'A softer start',
    slug: 'a-softer-start',
    description:
      'A quiet morning flow to start with attention instead of urgency.',
    durationMinutes: 12,
    level: 'BEGINNER' as const,
    videoUrl:
      'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8',
    videoSourceType: 'HLS' as const,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80',
    coachSlug: 'jon-bell',
    categorySlug: 'mindful-movement',
    interestSlugs: ['yoga', 'meditation'],
  },
];

async function main() {
  for (const interest of interests) {
    await prisma.interest.upsert({
      where: { slug: interest.slug },
      update: { name: interest.name },
      create: interest,
    });
  }

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
  }

  for (const coach of coaches) {
    await prisma.coach.upsert({
      where: { slug: coach.slug },
      update: { name: coach.name, bio: coach.bio },
      create: coach,
    });
  }

  for (const workout of workouts) {
    const { coachSlug, categorySlug, interestSlugs, ...workoutData } = workout;
    const coach = await prisma.coach.findUniqueOrThrow({
      where: { slug: coachSlug },
    });
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: categorySlug },
    });
    const savedWorkout = await prisma.workout.upsert({
      where: { slug: workout.slug },
      update: {
        ...workoutData,
        coachId: coach.id,
        categoryId: category.id,
        isPublished: true,
        publishedAt: new Date(),
      },
      create: {
        ...workoutData,
        coachId: coach.id,
        categoryId: category.id,
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    await prisma.workoutInterest.deleteMany({
      where: { workoutId: savedWorkout.id },
    });
    const linkedInterests = await prisma.interest.findMany({
      where: { slug: { in: interestSlugs } },
      select: { id: true },
    });
    await prisma.workoutInterest.createMany({
      data: linkedInterests.map(({ id }) => ({
        workoutId: savedWorkout.id,
        interestId: id,
      })),
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
