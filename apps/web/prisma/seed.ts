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

async function main() {
  for (const interest of interests) {
    await prisma.interest.upsert({
      where: { slug: interest.slug },
      update: { name: interest.name },
      create: interest,
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
