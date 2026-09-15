import {
  AdminRequiredError,
  AuthenticationRequiredError,
  isAdmin,
  requireAdmin,
} from '../src/authorization';
import { prisma } from '@mini-workout/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mini-workout/database', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

beforeEach(() => vi.clearAllMocks());

describe('admin authorization', () => {
  it('accepts only the exact ADMIN role', () => {
    expect(isAdmin({ role: 'ADMIN' })).toBe(true);
    expect(isAdmin({ role: 'MEMBER' })).toBe(false);
    expect(isAdmin({ role: 'admin' })).toBe(false);
    expect(isAdmin({ role: null })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it('rejects a missing session without querying the database', async () => {
    await expect(requireAdmin(null)).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a member even if a caller provides a stale ADMIN claim', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'MEMBER',
    } as never);
    await expect(
      requireAdmin({ user: { id: 'user-1', role: 'ADMIN' } }),
    ).rejects.toBeInstanceOf(AdminRequiredError);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { role: true },
    });
  });

  it('allows an admin whose current database role is ADMIN', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'ADMIN',
    } as never);
    await expect(requireAdmin({ user: { id: 'user-1' } })).resolves.toEqual({
      userId: 'user-1',
    });
  });

  it('rejects a deleted user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(
      requireAdmin({ user: { id: 'user-1' } }),
    ).rejects.toBeInstanceOf(AdminRequiredError);
  });
});
