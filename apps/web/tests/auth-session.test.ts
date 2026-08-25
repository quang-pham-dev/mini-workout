import { getCurrentSession, getUserProfile } from '@/lib/auth/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-test': '1' })),
}));

vi.mock('@/auth', () => ({
  auth: {
    api: {
      getSession: (args: unknown) => getSessionMock(args),
    },
  },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

describe('getCurrentSession', () => {
  beforeEach(() => {
    getSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } });
  });

  it('passes the current request headers to better-auth', async () => {
    const session = await getCurrentSession();

    expect(getSessionMock).toHaveBeenCalledTimes(1);
    const args = getSessionMock.mock.calls[0]?.[0] as
      { headers?: unknown } | undefined;
    expect(args?.headers).toBeInstanceOf(Headers);
    expect(session).toEqual({ user: { id: 'u1' } });
  });

  it('reuses the cached session within the same request scope', async () => {
    await getCurrentSession();
    await getCurrentSession();

    expect(getSessionMock).toHaveBeenCalled();
  });
});

describe('getUserProfile', () => {
  beforeEach(() => {
    findUniqueMock.mockReset().mockResolvedValue({
      onboardingCompleted: true,
      interests: [],
    });
  });

  it('queries the onboarded state and interests for the user', async () => {
    const profile = await getUserProfile('u1');

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: {
        onboardingCompleted: true,
        interests: { select: { interestId: true } },
      },
    });
    expect(profile).toEqual({ onboardingCompleted: true, interests: [] });
  });
});
