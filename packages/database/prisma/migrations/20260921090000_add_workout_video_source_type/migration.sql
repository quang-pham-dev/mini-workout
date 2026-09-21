-- CreateEnum
CREATE TYPE "WorkoutVideoSourceType" AS ENUM ('MP4', 'HLS');

-- AlterTable
ALTER TABLE "Workout"
ADD COLUMN "videoSourceType" "WorkoutVideoSourceType" NOT NULL DEFAULT 'MP4';
