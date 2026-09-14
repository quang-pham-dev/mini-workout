import {
  getCurrentSession,
  getUserProfile,
  requireOnboardedUser,
  requireSession,
} from '@/lib/auth/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const findUniqueMock = vi.fn();
const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error(`REDIRECT: ${url}`);
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-test': '1' })),
}));

vi.mock('next/server', () => ({
  connection: vi.fn(async () => {}),
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
      onboardingStatus: 'REQUIRED_COMPLETED',
      currentStep: 'WEEKLY_SCHEDULE',
      completedSteps: ['EXPERIENCE_LEVEL', 'INTERESTS'],
      skippedSteps: [],
      experienceLevel: 'BEGINNER',
      weeklyGoalDays: null,
      targetFocusNotes: null,
      interests: [],
    });
  });

  it('queries onboarding state and recommendation fields for the user', async () => {
    const profile = await getUserProfile('u1');

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: {
        onboardingStatus: true,
        currentStep: true,
        completedSteps: true,
        skippedSteps: true,
        experienceLevel: true,
        weeklyGoalDays: true,
        targetFocusNotes: true,
        interests: { select: { interestId: true } },
      },
    });
    expect(profile).toMatchObject({
      onboardingStatus: 'REQUIRED_COMPLETED',
      currentStep: 'WEEKLY_SCHEDULE',
      interests: [],
    });
  });
});

describe('requireSession', () => {
  beforeEach(() => {
    redirectMock.mockReset();
  });

  it('redirects to /login when session has no user', async () => {
    getSessionMock.mockResolvedValueOnce(null);

    await expect(requireSession()).rejects.toThrow('REDIRECT: /login');
    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('returns session when user is authenticated', async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: 'u1' } });

    const session = await requireSession();
    expect(session).toEqual({ user: { id: 'u1' } });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe('requireOnboardedUser', () => {
  beforeEach(() => {
    redirectMock.mockReset();
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
  });

  it('redirects to the current onboarding step when user is in progress', async () => {
    findUniqueMock.mockResolvedValueOnce({
      onboardingStatus: 'IN_PROGRESS',
      currentStep: 'INTERESTS',
      interests: [],
    });

    await expect(requireOnboardedUser()).rejects.toThrow(
      'REDIRECT: /onboarding?step=INTERESTS',
    );
    expect(redirectMock).toHaveBeenCalledWith('/onboarding?step=INTERESTS');
  });

  it('returns session and profile when user completed required onboarding', async () => {
    findUniqueMock.mockResolvedValueOnce({
      onboardingStatus: 'REQUIRED_COMPLETED',
      currentStep: 'WEEKLY_SCHEDULE',
      interests: [{ interestId: 'int-1' }],
    });

    const result = await requireOnboardedUser();
    expect(result.session).toEqual({ user: { id: 'u1' } });
    expect(result.profile.onboardingStatus).toBe('REQUIRED_COMPLETED');
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('returns session and profile when user completed all onboarding', async () => {
    findUniqueMock.mockResolvedValueOnce({
      onboardingStatus: 'COMPLETED',
      currentStep: 'DONE',
      interests: [{ interestId: 'int-1' }],
    });

    const result = await requireOnboardedUser();
    expect(result.profile.onboardingStatus).toBe('COMPLETED');
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
