// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@videojs/react/video', () => ({
  VideoPlayer: ({
    children,
    poster,
    title,
  }: {
    children: React.ReactNode;
    poster?: string;
    title?: string;
  }) => (
    <div data-poster={poster} data-testid="video-player" data-title={title}>
      {children}
    </div>
  ),
  VideoSkin: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="video-skin">
      {children}
    </div>
  ),
  Video: (props: React.VideoHTMLAttributes<HTMLVideoElement>) => (
    <video data-testid="mp4-video" {...props} />
  ),
}));

vi.mock('@videojs/react/media/hlsjs-video', () => ({
  HlsJsVideo: ({
    source,
    streamType,
    ...props
  }: React.VideoHTMLAttributes<HTMLVideoElement> & {
    source?: { src: string; type?: string };
    streamType?: string;
  }) => (
    <video
      data-source-src={source?.src}
      data-source-type={source?.type}
      data-stream-type={streamType}
      data-testid="hls-video"
      {...props}
    />
  ),
}));

const { WorkoutPlayer } =
  await import('@/features/workouts/components/workout-player');

describe('WorkoutPlayer', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.replaceChildren();
  });

  it('renders an inline MP4 without autoplay', async () => {
    await act(async () => {
      root.render(
        <WorkoutPlayer
          poster="https://example.com/poster.jpg"
          sourceType="MP4"
          src="https://example.com/workout.mp4"
          title="Morning mobility"
        />,
      );
    });

    const player = container.querySelector('[data-testid="video-player"]');
    const video = container.querySelector<HTMLVideoElement>(
      '[data-testid="mp4-video"]',
    );

    expect(player?.getAttribute('data-poster')).toBe(
      'https://example.com/poster.jpg',
    );
    expect(player?.getAttribute('data-title')).toBe('Morning mobility');
    expect(video?.getAttribute('src')).toBe('https://example.com/workout.mp4');
    expect(video?.getAttribute('preload')).toBe('metadata');
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video?.hasAttribute('autoplay')).toBe(false);
  });

  it('uses the HLS.js adapter for HLS workouts', async () => {
    await act(async () => {
      root.render(
        <WorkoutPlayer
          poster="https://example.com/poster.jpg"
          sourceType="HLS"
          src="https://example.com/workout.m3u8"
          title="Recovery flow"
        />,
      );
    });

    const video = container.querySelector<HTMLVideoElement>(
      '[data-testid="hls-video"]',
    );

    expect(video?.getAttribute('data-source-src')).toBe(
      'https://example.com/workout.m3u8',
    );
    expect(video?.getAttribute('data-source-type')).toBe(
      'application/vnd.apple.mpegurl',
    );
    expect(video?.getAttribute('data-stream-type')).toBe('on-demand');
    expect(video?.getAttribute('preload')).toBe('metadata');
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video?.hasAttribute('autoplay')).toBe(false);
  });
});
