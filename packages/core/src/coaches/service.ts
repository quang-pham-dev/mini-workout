import {
  type AdminPage,
  type AdminPageInput,
  adminPageInput,
  makeAdminPage,
} from '../admin-pagination';
import { parseInput } from '../parse-input';
import { requireAdminActor } from '../users/service';
import * as repository from './repository';

export async function listAdminCoaches(
  input: AdminPageInput,
): Promise<AdminPage<repository.AdminCoachRow>> {
  const { actorId, cursor, limit } = parseInput(adminPageInput, input);
  await requireAdminActor(actorId);
  const rows = await repository.findAdminCoaches({ cursor, take: limit + 1 });
  return makeAdminPage(rows, limit);
}
