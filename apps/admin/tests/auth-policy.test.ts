import { classifyAdminAccess, requireAdminActor } from '@/lib/auth-policy';
import {
  AdminRequiredError,
  AuthenticationRequiredError,
} from '@mini-workout/auth/authorization';
import { describe, expect, it, vi } from 'vitest';

const adminSession = {
  user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin' },
};

describe('admin access policy', () => {
  it('classifies an absent session without calling authorization', async () => {
    const authorize = vi.fn();
    await expect(classifyAdminAccess(null, authorize)).resolves.toEqual({
      status: 'unauthenticated',
    });
    expect(authorize).not.toHaveBeenCalled();
  });

  it('returns the authenticated viewer only after current-role authorization', async () => {
    const authorize = vi.fn().mockResolvedValue({ userId: 'admin-1' });
    await expect(classifyAdminAccess(adminSession, authorize)).resolves.toEqual(
      {
        status: 'authenticated',
        userId: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
      },
    );
    expect(authorize).toHaveBeenCalledWith(adminSession);
  });

  it('classifies a member or downgraded admin as forbidden', async () => {
    const authorize = vi.fn().mockRejectedValue(new AdminRequiredError());
    await expect(classifyAdminAccess(adminSession, authorize)).resolves.toEqual(
      {
        status: 'forbidden',
      },
    );
  });

  it('does not hide unexpected authorization failures', async () => {
    const failure = new Error('database unavailable');
    await expect(
      classifyAdminAccess(adminSession, vi.fn().mockRejectedValue(failure)),
    ).rejects.toBe(failure);
  });

  it('rejects a direct protected call without a session', async () => {
    await expect(requireAdminActor(null, vi.fn())).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
  });

  it('authorizes every direct protected call and returns only actor id', async () => {
    const authorize = vi.fn().mockResolvedValue({ userId: 'admin-1' });
    await expect(requireAdminActor(adminSession, authorize)).resolves.toEqual({
      userId: 'admin-1',
    });
    expect(authorize).toHaveBeenCalledOnce();
  });
});
