import { getInterests as listInterests } from '@mini-workout/core/onboarding';
import 'server-only';

export async function getInterests() {
  return listInterests();
}
