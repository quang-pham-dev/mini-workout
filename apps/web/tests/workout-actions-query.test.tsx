// @vitest-environment jsdom
import { workoutKeys } from '@/lib/workouts/cache';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();
const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('sonner', () => ({
  toast: { error: toastError },
}));

const { WorkoutActions } =
  await import('@/components/workout-card/workout-actions');
const { SignOutButton } =
  await import('@/features/profile/components/sign-out-button');

describe('WorkoutActions query synchronization', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let queryClient: QueryClient;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(workoutKeys.engagement('viewer-1', 'workout-1'), {
      workoutId: 'workout-1',
      likeCount: 3,
      liked: false,
      favorited: false,
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    queryClient.clear();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('updates every mounted instance through one viewer-scoped cache entry', async () => {
    let resolveMutation!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveMutation = resolve;
          }),
      )
      .mockResolvedValue(
        Response.json({
          workoutId: 'workout-1',
          likeCount: 4,
          liked: true,
          favorited: false,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <WorkoutActions viewerId="viewer-1" workoutId="workout-1" />
          <WorkoutActions viewerId="viewer-1" workoutId="workout-1" />
        </QueryClientProvider>,
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();

    const likeButtons = container.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Like workout"]',
    );
    expect(likeButtons).toHaveLength(2);

    await act(async () => {
      likeButtons[0]?.click();
      await Promise.resolve();
    });

    expect(
      container.querySelectorAll('[aria-label="Unlike workout"]'),
    ).toHaveLength(2);
    expect(container.textContent?.match(/4/g)).toHaveLength(2);

    await act(async () => {
      resolveMutation(
        Response.json({
          workoutId: 'workout-1',
          likeCount: 4,
          liked: true,
          favorited: false,
        }),
      );
      await Promise.resolve();
    });

    expect(refresh).toHaveBeenCalledOnce();
  });

  it('clears viewer-scoped server state before sign-out submission', async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <SignOutButton />
        </QueryClientProvider>,
      );
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
    act(() => container.querySelector<HTMLButtonElement>('button')?.click());
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('rolls back a failed optimistic mutation and shows the safe request reference', async () => {
    let rejectMutation!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            rejectMutation = resolve;
          }),
      ),
    );

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <WorkoutActions viewerId="viewer-1" workoutId="workout-1" />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Like workout"]')
        ?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(
      container.querySelector('[aria-label="Unlike workout"]'),
    ).toBeTruthy();

    await act(async () => {
      rejectMutation(
        Response.json(
          {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Something went wrong. Please try again.',
              requestId: 'request-123',
            },
          },
          { status: 500 },
        ),
      );
      await vi.waitFor(() => expect(toastError).toHaveBeenCalledOnce());
    });

    const rolledBack = container.querySelector<HTMLButtonElement>(
      '[aria-label="Like workout"]',
    );
    expect(rolledBack?.textContent).toContain('3');
    expect(toastError).toHaveBeenCalledWith(
      'Something went wrong. Please try again. Reference: request-123',
    );
  });
});
