-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "level" "ExperienceLevel" NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "coachId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutInterest" (
    "workoutId" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    CONSTRAINT "WorkoutInterest_pkey" PRIMARY KEY ("workoutId", "interestId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coach_slug_key" ON "Coach"("slug");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Workout_slug_key" ON "Workout"("slug");
CREATE INDEX "Workout_isPublished_publishedAt_idx" ON "Workout"("isPublished", "publishedAt");
CREATE INDEX "Workout_categoryId_idx" ON "Workout"("categoryId");
CREATE INDEX "Workout_coachId_idx" ON "Workout"("coachId");
CREATE INDEX "WorkoutInterest_interestId_idx" ON "WorkoutInterest"("interestId");

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkoutInterest" ADD CONSTRAINT "WorkoutInterest_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutInterest" ADD CONSTRAINT "WorkoutInterest_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
