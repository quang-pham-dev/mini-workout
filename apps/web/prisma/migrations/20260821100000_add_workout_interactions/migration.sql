-- CreateTable
CREATE TABLE "WorkoutLike" (
    "userId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutLike_pkey" PRIMARY KEY ("userId", "workoutId")
);

-- CreateTable
CREATE TABLE "WorkoutFavorite" (
    "userId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutFavorite_pkey" PRIMARY KEY ("userId", "workoutId")
);

-- CreateIndex
CREATE INDEX "WorkoutLike_workoutId_idx" ON "WorkoutLike"("workoutId");
CREATE INDEX "WorkoutFavorite_workoutId_idx" ON "WorkoutFavorite"("workoutId");

-- AddForeignKey
ALTER TABLE "WorkoutLike" ADD CONSTRAINT "WorkoutLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutLike" ADD CONSTRAINT "WorkoutLike_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutFavorite" ADD CONSTRAINT "WorkoutFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutFavorite" ADD CONSTRAINT "WorkoutFavorite_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
