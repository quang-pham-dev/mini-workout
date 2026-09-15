import { z } from 'zod';

export const adminPageInput = z.object({
  actorId: z.string().min(1),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type AdminPageInput = z.input<typeof adminPageInput>;
export type AdminPage<T> = { items: T[]; nextCursor: string | null };

export function makeAdminPage<T extends { id: string }>(
  rows: T[],
  limit: number,
): AdminPage<T> {
  const items = rows.slice(0, limit);
  return {
    items,
    nextCursor: rows.length > limit ? (items.at(-1)?.id ?? null) : null,
  };
}
