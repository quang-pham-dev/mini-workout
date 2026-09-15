-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'REQUIRED_COMPLETED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('EXPERIENCE_LEVEL', 'INTERESTS', 'WEEKLY_SCHEDULE', 'FITNESS_GOALS', 'DONE');

-- AlterTable
ALTER TABLE "user" ADD COLUMN "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "user" ADD COLUMN "currentStep" "OnboardingStep" NOT NULL DEFAULT 'EXPERIENCE_LEVEL';
ALTER TABLE "user" ADD COLUMN "completedSteps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "user" ADD COLUMN "skippedSteps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "user" ADD COLUMN "weeklyGoalDays" INTEGER;
ALTER TABLE "user" ADD COLUMN "targetFocusNotes" TEXT;

-- Backfill existing users from the legacy boolean flag.
UPDATE "user"
SET
  "onboardingStatus" = CASE
    WHEN "onboardingCompleted" = true THEN 'COMPLETED'::"OnboardingStatus"
    ELSE 'NOT_STARTED'::"OnboardingStatus"
  END,
  "currentStep" = CASE
    WHEN "onboardingCompleted" = true THEN 'DONE'::"OnboardingStep"
    ELSE 'EXPERIENCE_LEVEL'::"OnboardingStep"
  END,
  "completedSteps" = CASE
    WHEN "onboardingCompleted" = true THEN ARRAY['EXPERIENCE_LEVEL', 'INTERESTS', 'WEEKLY_SCHEDULE', 'FITNESS_GOALS']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "onboardingCompleted";
