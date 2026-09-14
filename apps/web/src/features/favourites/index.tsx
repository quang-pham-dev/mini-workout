import { EmptyState } from './components/empty-state';
import { FavouritesHeaderSection } from './components/favourites-header-section';
import { FavouritesSection } from './components/favourites-section';
import { findSavedWorkouts } from './queries';
import { requireOnboardedUser } from '@/lib/auth/session';

export async function FavouritesContent() {
  const { session } = await requireOnboardedUser();

  const savedWorkouts = await findSavedWorkouts(session.user.id);

  if (savedWorkouts.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <FavouritesHeaderSection
        savedWorkoutsCount={savedWorkouts?.length || 0}
      />
      <FavouritesSection savedWorkouts={savedWorkouts} />
    </>
  );
}
